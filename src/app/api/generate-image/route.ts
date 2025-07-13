import { NextResponse } from 'next/server';
import { fal } from "@fal-ai/client";

export async function POST(request: Request) {
  try {
    const { prompt, style, size } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // Check if API key is available
    if (!process.env.FAL_API_KEY) {
      console.error('FAL_API_KEY environment variable is missing');
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    // Configure FAL with API key
    fal.config({
      credentials: process.env.FAL_API_KEY,
    });

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

    // Convert size to FAL image size format
    let imageSize: "square_hd" | "square" | "portrait_4_3" | "portrait_16_9" | "landscape_4_3" | "landscape_16_9" = "square_hd";
    switch (size) {
      case "1024x768":
        imageSize = "landscape_4_3";
        break;
      case "768x1024":
        imageSize = "portrait_4_3";
        break;
      case "1024x1024":
      default:
        imageSize = "square_hd";
        break;
    }

    console.log('Generating image with prompt:', enhancedPrompt);
    console.log('Using API key (first 10 chars):', process.env.FAL_API_KEY?.substring(0, 10));

    // Use a more reliable FAL model
    const result = await fal.subscribe("fal-ai/flux/schnell", {
      input: {
        prompt: enhancedPrompt,
        image_size: imageSize,
        num_inference_steps: 4,
        num_images: 1,
        enable_safety_checker: true,
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
      console.error('No images in result:', result.data);
      return NextResponse.json({ error: 'No images generated' }, { status: 500 });
    }

    return NextResponse.json({ 
      imageUrl: result.data.images[0].url,
      prompt: enhancedPrompt,
      width: result.data.images[0].width || 1024,
      height: result.data.images[0].height || 1024
    });

  } catch (error) {
    console.error('Error in image generation:', error);
    
    // More detailed error logging
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    return NextResponse.json({ 
      error: 'Failed to generate image', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 