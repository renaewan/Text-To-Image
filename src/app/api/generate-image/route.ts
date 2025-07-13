import { NextResponse } from 'next/server';
import { fal } from "@fal-ai/client";

// Configure FAL with API key
fal.config({
  credentials: process.env.FAL_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { prompt, style, size } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // Enhance prompt based on style
    let enhancedPrompt = prompt;
    switch (style) {
      case 'photorealistic':
        enhancedPrompt = `${prompt}, photorealistic, high detail, 8k resolution, professional photography`;
        break;
      case 'artistic':
        enhancedPrompt = `${prompt}, artistic style, beautiful composition, creative interpretation`;
        break;
      case 'anime':
        enhancedPrompt = `${prompt}, anime style, manga art, vibrant colors, detailed illustration`;
        break;
      case 'digital-art':
        enhancedPrompt = `${prompt}, digital art, concept art, detailed illustration, trending on artstation`;
        break;
      default:
        enhancedPrompt = `${prompt}, high quality, detailed`;
    }

    // Convert size to aspect ratio
    let aspectRatio = "1:1"; // default square
    switch (size) {
      case "1024x768":
        aspectRatio = "4:3";
        break;
      case "768x1024":
        aspectRatio = "3:4";
        break;
      case "1024x1024":
      default:
        aspectRatio = "1:1";
        break;
    }

    console.log('Generating image with prompt:', enhancedPrompt);

    const result = await fal.subscribe("fal-ai/flux-pro/v1.1-ultra", {
      input: {
        prompt: enhancedPrompt,
        num_images: 1,
        enable_safety_checker: true,
        output_format: "jpeg",
        safety_tolerance: "2",
        aspect_ratio: aspectRatio
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS") {
          update.logs.map((log) => log.message).forEach(console.log);
        }
      },
    });

    console.log('FAL API Result:', result.data);

    if (!result.data?.images || result.data.images.length === 0) {
      return NextResponse.json({ error: 'No images generated' }, { status: 500 });
    }

    return NextResponse.json({ 
      imageUrl: result.data.images[0].url,
      prompt: enhancedPrompt,
      width: result.data.images[0].width,
      height: result.data.images[0].height
    });

  } catch (error) {
    console.error('Error in image generation:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 