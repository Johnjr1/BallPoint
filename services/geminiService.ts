import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type, LiveSession } from "@google/genai";

// We define the tool to let the model report shots
const logShotTool: FunctionDeclaration = {
  name: 'logShot',
  description: 'Log a basketball shot attempt with its result and court position.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      result: {
        type: Type.STRING,
        enum: ['MAKE', 'MISS'],
        description: 'Whether the ball went into the hoop (MAKE) or missed (MISS).'
      },
      position: {
        type: Type.STRING,
        enum: ['LEFT', 'CENTER', 'RIGHT'],
        description: 'The position on the court relative to the basket where the shot was taken.'
      }
    },
    required: ['result', 'position']
  }
};

interface ConnectOptions {
  apiKey: string;
  onShotDetected: (result: string, position: string) => void;
  onStatusChange: (status: string) => void;
}

export class GeminiLiveService {
  private ai: GoogleGenAI;
  private sessionPromise: Promise<LiveSession> | null = null;
  private active: boolean = false;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  async connect({ apiKey, onShotDetected, onStatusChange }: ConnectOptions) {
    onStatusChange('Connecting...');
    
    // Create new instance with fresh key to be safe
    this.ai = new GoogleGenAI({ apiKey });
    
    this.active = true;

    this.sessionPromise = this.ai.live.connect({
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      callbacks: {
        onopen: () => {
          console.log('Gemini Live Session Opened');
          onStatusChange('Connected');
        },
        onmessage: (message: LiveServerMessage) => {
          if (message.toolCall) {
            for (const fc of message.toolCall.functionCalls) {
              if (fc.name === 'logShot') {
                const { result, position } = fc.args as { result: string; position: string };
                console.log(`Tool Call: ${result} from ${position}`);
                onShotDetected(result, position);
                
                // Respond to tool call
                this.sessionPromise?.then((session) => {
                   session.sendToolResponse({
                    functionResponses: {
                      id: fc.id,
                      name: fc.name,
                      response: { result: "Shot logged successfully" }
                    }
                   });
                });
              }
            }
          }
        },
        onclose: () => {
          console.log('Gemini Live Session Closed');
          onStatusChange('Disconnected');
        },
        onerror: (err) => {
          console.error('Gemini Live Session Error', err);
          onStatusChange('Error');
        }
      },
      config: {
        responseModalities: [Modality.AUDIO], // We want it to speak, but primarily use tools
        systemInstruction: `
          You are an expert basketball AI referee. 
          Your job is to visually analyze the video stream of a basketball practice.
          Identify when a player shoots the ball.
          Determine the outcome: 'MAKE' (ball goes through hoop) or 'MISS'.
          Determine the position relative to the hoop: 'LEFT', 'CENTER', or 'RIGHT'.
          IMMEDIATELY call the 'logShot' function when a shot completes.
          Ignore dribbling or non-shooting actions.
          Be precise and fast.
        `,
        tools: [{ functionDeclarations: [logShotTool] }],
      }
    });

    return this.sessionPromise;
  }

  async sendFrame(base64Image: string) {
    if (!this.sessionPromise || !this.active) return;
    
    try {
        const session = await this.sessionPromise;
        await session.sendRealtimeInput({
            media: {
                mimeType: 'image/jpeg',
                data: base64Image
            }
        });
    } catch (e) {
        console.error("Error sending frame", e);
    }
  }

  async disconnect() {
    this.active = false;
    if (this.sessionPromise) {
      const session = await this.sessionPromise;
      // Close not directly available on session object in all SDK versions, 
      // but strictly speaking we stop sending frames. 
      // The SDK manages connection via the promise lifecycle usually.
      // There isn't a direct .close() on the interface in the prompt documentation, 
      // but we will stop the loop.
    }
    this.sessionPromise = null;
  }
}
