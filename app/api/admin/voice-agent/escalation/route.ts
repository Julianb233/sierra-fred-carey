import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

// GET - Fetch all escalation rules for a config
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const configId = searchParams.get('config_id');
    const supabase = createServiceClient();

    let query = supabase
      .from('escalation_rules')
      .select('*')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    if (configId) {
      query = query.eq('config_id', configId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error fetching escalation rules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch escalation rules' },
      { status: 500 }
    );
  }
}

// POST - Create new escalation rule
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = createServiceClient();

    const {
      config_id,
      name,
      description,
      trigger_type,
      trigger_keywords,
      sentiment_threshold,
      time_limit_seconds,
      trigger_intents,
      custom_condition,
      action = 'offer_transfer',
      transfer_to,
      action_message,
      priority = 0
    } = body;

    if (!config_id || !name || !trigger_type) {
      return NextResponse.json(
        { error: 'config_id, name, and trigger_type are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('escalation_rules')
      .insert({
        config_id,
        name,
        description,
        trigger_type,
        trigger_keywords,
        sentiment_threshold,
        time_limit_seconds,
        trigger_intents,
        custom_condition,
        action,
        transfer_to,
        action_message,
        priority
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error creating escalation rule:', error);
    return NextResponse.json(
      { error: 'Failed to create escalation rule' },
      { status: 500 }
    );
  }
}

// PUT - Update escalation rule
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = createServiceClient();

    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Rule ID required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('escalation_rules')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating escalation rule:', error);
    return NextResponse.json(
      { error: 'Failed to update escalation rule' },
      { status: 500 }
    );
  }
}

// DELETE - Delete escalation rule
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const supabase = createServiceClient();

    if (!id) {
      return NextResponse.json({ error: 'Rule ID required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('escalation_rules')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting escalation rule:', error);
    return NextResponse.json(
      { error: 'Failed to delete escalation rule' },
      { status: 500 }
    );
  }
}
