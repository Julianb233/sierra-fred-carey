import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

// GET - Fetch voice agent configuration
export async function GET() {
  try {
    const configs = await sql`
      SELECT * FROM voice_agent_config
      WHERE is_active = true
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (configs.length === 0) {
      return NextResponse.json({ error: 'No active configuration found' }, { status: 404 });
    }

    return NextResponse.json(configs[0]);
  } catch (error) {
    console.error('Error fetching voice agent config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch configuration' },
      { status: 500 }
    );
  }
}

// PUT - Update voice agent configuration
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      name,
      system_prompt,
      greeting_message,
      voice,
      max_response_length,
      response_style,
      language,
      business_hours,
      timezone,
      after_hours_behavior,
      after_hours_message,
      fallback_message
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Configuration ID required' }, { status: 400 });
    }

    const updated = await sql`
      UPDATE voice_agent_config
      SET
        name = COALESCE(${name}, name),
        system_prompt = COALESCE(${system_prompt}, system_prompt),
        greeting_message = COALESCE(${greeting_message}, greeting_message),
        voice = COALESCE(${voice}, voice),
        max_response_length = COALESCE(${max_response_length}, max_response_length),
        response_style = COALESCE(${response_style}, response_style),
        language = COALESCE(${language}, language),
        business_hours = COALESCE(${business_hours ? JSON.stringify(business_hours) : null}::jsonb, business_hours),
        timezone = COALESCE(${timezone}, timezone),
        after_hours_behavior = COALESCE(${after_hours_behavior}, after_hours_behavior),
        after_hours_message = COALESCE(${after_hours_message}, after_hours_message),
        fallback_message = COALESCE(${fallback_message}, fallback_message),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    if (updated.length === 0) {
      return NextResponse.json({ error: 'Configuration not found' }, { status: 404 });
    }

    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error('Error updating voice agent config:', error);
    return NextResponse.json(
      { error: 'Failed to update configuration' },
      { status: 500 }
    );
  }
}

// POST - Create new voice agent configuration
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name = 'New Agent',
      system_prompt = 'You are a helpful AI assistant.',
      greeting_message = 'Hello! How can I help you today?',
      voice = 'alloy',
      response_style = 'professional',
      created_by
    } = body;

    const created = await sql`
      INSERT INTO voice_agent_config (
        name, system_prompt, greeting_message, voice, response_style, created_by
      ) VALUES (
        ${name}, ${system_prompt}, ${greeting_message}, ${voice}, ${response_style}, ${created_by}
      )
      RETURNING *
    `;

    return NextResponse.json(created[0], { status: 201 });
  } catch (error) {
    console.error('Error creating voice agent config:', error);
    return NextResponse.json(
      { error: 'Failed to create configuration' },
      { status: 500 }
    );
  }
}
