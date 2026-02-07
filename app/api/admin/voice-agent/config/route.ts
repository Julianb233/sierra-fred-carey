import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { isAdminRequest } from "@/lib/auth/admin";

// GET - Fetch voice agent configuration
export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('voice_agent_config')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (!data) {
      // Return default config if none exists
      return NextResponse.json({
        id: null,
        name: 'Fred Cary',
        is_active: true,
        system_prompt: `You are Fred Cary, serial entrepreneur, investor, and founder of Sahara -- an AI-powered mentorship platform for startup founders.

About you:
- Founded 40+ companies across tech, media, and consumer sectors
- Taken 3 companies public and had 2 acquired
- 50+ years of experience mentoring first-time and growth-stage founders
- You built Sahara to give every founder access to the guidance you wish you'd had

Voice style:
- Direct, no-BS, warm but honest
- Keep responses to 2-3 sentences max per turn
- Ask one focused question at a time

Never say "AI assistant", "A Startup Biz", or "I apologize".`,
        greeting_message: 'Hey, it\'s Fred. What\'s on your mind today?',
        voice: 'alloy',
        max_response_length: 150,
        response_style: 'professional',
        language: 'en',
        business_hours: {
          monday: { enabled: true, start: '09:00', end: '17:00' },
          tuesday: { enabled: true, start: '09:00', end: '17:00' },
          wednesday: { enabled: true, start: '09:00', end: '17:00' },
          thursday: { enabled: true, start: '09:00', end: '17:00' },
          friday: { enabled: true, start: '09:00', end: '17:00' },
          saturday: { enabled: false, start: '09:00', end: '17:00' },
          sunday: { enabled: false, start: '09:00', end: '17:00' },
        },
        timezone: 'America/New_York',
        after_hours_behavior: 'voicemail',
        after_hours_message: 'It\'s Fred -- I\'m offline right now. Leave a message and I\'ll get back to you, or text me through Sahara.',
        fallback_message: 'That\'s outside my lane -- let me connect you with someone on the Sahara team who can help.',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch configuration' },
      { status: 500 }
    );
  }
}

// PUT - Update voice agent configuration
export async function PUT(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const supabase = createServiceClient();

    if (body.id) {
      // Update existing config
      const { data, error } = await supabase
        .from('voice_agent_config')
        .update({
          name: body.name,
          is_active: body.is_active,
          system_prompt: body.system_prompt,
          greeting_message: body.greeting_message,
          voice: body.voice,
          max_response_length: body.max_response_length,
          response_style: body.response_style,
          language: body.language,
          business_hours: body.business_hours,
          timezone: body.timezone,
          after_hours_behavior: body.after_hours_behavior,
          after_hours_message: body.after_hours_message,
          fallback_message: body.fallback_message,
          updated_at: new Date().toISOString(),
        })
        .eq('id', body.id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json(data);
    } else {
      // Create new config
      const { data, error } = await supabase
        .from('voice_agent_config')
        .insert({
          name: body.name || 'Default Agent',
          is_active: true,
          system_prompt: body.system_prompt,
          greeting_message: body.greeting_message,
          voice: body.voice || 'alloy',
          max_response_length: body.max_response_length || 150,
          response_style: body.response_style || 'professional',
          language: body.language || 'en',
          business_hours: body.business_hours,
          timezone: body.timezone || 'America/New_York',
          after_hours_behavior: body.after_hours_behavior || 'voicemail',
          after_hours_message: body.after_hours_message,
          fallback_message: body.fallback_message,
        })
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json(data, { status: 201 });
    }
  } catch (error) {
    console.error('Error updating config:', error);
    return NextResponse.json(
      { error: 'Failed to update configuration' },
      { status: 500 }
    );
  }
}

// POST - Create new voice agent configuration
export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('voice_agent_config')
      .insert({
        name: body.name || 'Default Agent',
        is_active: true,
        system_prompt: body.system_prompt,
        greeting_message: body.greeting_message,
        voice: body.voice || 'alloy',
        max_response_length: body.max_response_length || 150,
        response_style: body.response_style || 'professional',
        language: body.language || 'en',
        business_hours: body.business_hours,
        timezone: body.timezone || 'America/New_York',
        after_hours_behavior: body.after_hours_behavior || 'voicemail',
        after_hours_message: body.after_hours_message,
        fallback_message: body.fallback_message,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error creating config:', error);
    return NextResponse.json(
      { error: 'Failed to create configuration' },
      { status: 500 }
    );
  }
}
