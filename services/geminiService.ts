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
          SIMPLE BASKETBALL SHOT DETECTOR
          
          WATCH THE ORANGE CIRCLE AT THE TOP-CENTER OF THE SCREEN.
          
          YOUR JOB:
          1. Watch for ANY object (ball) approaching the orange circle
          2. If the orange circle gets BLOCKED or COVERED by the object = REPORT 'MAKE' (scored)
          3. If the object MISSES and doesn't cover the circle = REPORT 'MISS'
          4. Report the shooting position: LEFT, CENTER, or RIGHT
          
          WHAT TO LOOK FOR:
          - Orange circle is always visible at top-center
          - When ball is thrown, it moves toward the circle
          - If ball covers/blocks the orange circle = ball went through = MAKE
          - If you see the ball but it never covers the orange circle = MISS
          - If you see the circle get blocked, call logShot with MAKE immediately
          - If you see a throw that misses the circle, call logShot with MISS immediately
          
          BE AGGRESSIVE:
          - Call logShot EVERY TIME you see a shot (throw toward basket)
          - Don't overthink - if circle gets covered, that's a MAKE
          - If ball visible but circle stays clear, that's a MISS
          - Detect position by where the throw comes from: LEFT/CENTER/RIGHT
          
          CALL THE FUNCTION FOR EVERY SHOT YOU SEE.
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
        console.log('Frame sent to Gemini');
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
