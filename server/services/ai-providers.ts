import OpenAI from "openai";

export type AIProvider = "openai" | "gcp_gemini";
export type ModelTier = "premium" | "standard" | "economy";

export interface AIConfig {
  provider: AIProvider;
  tier: ModelTier;
  temperature?: number;
}

export interface AIAnalysisRequest {
  systemPrompt: string;
  userPrompt: string;
  config: AIConfig;
}

export interface AIAnalysisResponse {
  content: string;
  provider: AIProvider;
  model: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

export class MultiProviderAIService {
  private openai: OpenAI;

  constructor() {
    // Initialize OpenAI
    this.openai = new OpenAI({ 
      apiKey: process.env.OPENAI_API_KEY || "sk-dummy-key"
    });
  }

  async analyze(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    const { provider, tier } = request.config;

    if (provider === "openai") {
      return this.analyzeWithOpenAI(request);
    } else if (provider === "gcp_gemini") {
      return this.analyzeWithGemini(request);
    } else {
      throw new Error(`Unsupported AI provider: ${provider}`);
    }
  }

  private async analyzeWithOpenAI(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    const model = this.getOpenAIModel(request.config.tier);
    
    try {
      const response = await this.openai.chat.completions.create({
        model,
        messages: [
          {
            role: "system",
            content: request.systemPrompt
          },
          {
            role: "user",
            content: request.userPrompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: request.config.temperature || 0.1,
      });

      return {
        content: response.choices[0].message.content || "{}",
        provider: "openai",
        model,
        usage: {
          promptTokens: response.usage?.prompt_tokens,
          completionTokens: response.usage?.completion_tokens,
          totalTokens: response.usage?.total_tokens,
        }
      };
    } catch (error: any) {
      console.error("OpenAI analysis error:", error);
      throw new Error(`OpenAI analysis failed: ${error?.message || 'Unknown error'}`);
    }
  }

  private async analyzeWithGemini(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY not configured. Please add your Gemini API key in the environment settings.");
    }

    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    const model = this.getGCPModel(request.config.tier);
    const geminiModel = genAI.getGenerativeModel({ 
      model,
      generationConfig: {
        temperature: request.config.temperature || 0.1,
        responseMimeType: "application/json",
      }
    });

    try {
      const prompt = `${request.systemPrompt}\n\n${request.userPrompt}`;
      const result = await geminiModel.generateContent(prompt);
      const response = await result.response;
      
      return {
        content: response.text() || "{}",
        provider: "gcp_gemini",
        model,
        usage: {
          promptTokens: response.usageMetadata?.promptTokenCount,
          completionTokens: response.usageMetadata?.candidatesTokenCount,
          totalTokens: response.usageMetadata?.totalTokenCount,
        }
      };
    } catch (error: any) {
      console.error("Gemini analysis error:", error);
      throw new Error(`Gemini analysis failed: ${error?.message || 'Unknown error'}`);
    }
  }

  private getOpenAIModel(tier: ModelTier): string {
    switch (tier) {
      case "premium":
        return "gpt-4o"; // Latest and most capable
      case "standard":
        return "gpt-4o-mini"; // Balanced performance and cost
      case "economy":
        return "gpt-3.5-turbo"; // Cost-effective option
      default:
        return "gpt-4o";
    }
  }

  private getGCPModel(tier: ModelTier): string {
    switch (tier) {
      case "premium":
        return "gemini-1.5-pro"; // Most capable Gemini model
      case "standard":
        return "gemini-1.5-flash"; // Balanced option
      case "economy":
        return "gemini-1.5-flash-8b"; // Most cost-effective
      default:
        return "gemini-1.5-pro";
    }
  }

  // Get available models for each provider
  getAvailableModels(): Record<AIProvider, Record<ModelTier, string>> {
    return {
      openai: {
        premium: "GPT-4o (Latest, Most Capable)",
        standard: "GPT-4o Mini (Balanced)",
        economy: "GPT-3.5 Turbo (Cost-Effective)"
      },
      gcp_gemini: {
        premium: "Gemini 1.5 Pro (Most Capable)",
        standard: "Gemini 1.5 Flash (Balanced)", 
        economy: "Gemini 1.5 Flash 8B (Cost-Effective)"
      }
    };
  }

  // Check which providers are available
  async checkProviderAvailability(): Promise<Record<AIProvider, boolean>> {
    const availability: Record<AIProvider, boolean> = {
      openai: false,
      gcp_gemini: false,
    };

    // Check OpenAI
    try {
      if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== "sk-dummy-key") {
        // Test with a simple request
        await this.openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: "test" }],
          max_tokens: 1,
        });
        availability.openai = true;
      }
    } catch (error: any) {
      console.log("OpenAI not available:", error?.message || 'Unknown error');
    }

    // Check GCP Gemini
    try {
      if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "dummy-key") {
        const { GoogleGenerativeAI } = await import("@google/generative-ai");
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        // Test with a simple request
        await model.generateContent("test");
        availability.gcp_gemini = true;
      }
    } catch (error: any) {
      console.log("GCP Gemini not available:", error?.message || 'Unknown error');
    }

    return availability;
  }
}