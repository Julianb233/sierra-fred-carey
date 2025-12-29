import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

// GET - Fetch all escalation rules for a config
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const configId = searchParams.get('config_id');

    let rules;
    if (configId) {
      rules = await sql`
        SELECT * FROM escalation_rules
        WHERE config_id = ${configId}
        ORDER BY priority DESC, created_at DESC
      `;
    } else {
      // Get rules for the default active config
      rules = await sql`
        SELECT er.* FROM escalation_rules er
        JOIN voice_agent_config vac ON er.config_id = vac.id
        WHERE vac.is_active = true
        ORDER BY er.priority DESC, er.created_at DESC
      `;
    }

    return NextResponse.json(rules);
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

    const created = await sql`
      INSERT INTO escalation_rules (
        config_id, name, description, trigger_type, trigger_keywords,
        sentiment_threshold, time_limit_seconds, trigger_intents,
        custom_condition, action, transfer_to, action_message, priority
      ) VALUES (
        ${config_id}, ${name}, ${description}, ${trigger_type},
        ${trigger_keywords || null}, ${sentiment_threshold || null},
        ${time_limit_seconds || null}, ${trigger_intents || null},
        ${custom_condition ? JSON.stringify(custom_condition) : null}::jsonb,
        ${action}, ${transfer_to}, ${action_message}, ${priority}
      )
      RETURNING *
    `;

    return NextResponse.json(created[0], { status: 201 });
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
    const {
      id,
      name,
      description,
      is_active,
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
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Rule ID required' }, { status: 400 });
    }

    const updated = await sql`
      UPDATE escalation_rules
      SET
        name = COALESCE(${name}, name),
        description = COALESCE(${description}, description),
        is_active = COALESCE(${is_active}, is_active),
        trigger_type = COALESCE(${trigger_type}, trigger_type),
        trigger_keywords = COALESCE(${trigger_keywords}, trigger_keywords),
        sentiment_threshold = COALESCE(${sentiment_threshold}, sentiment_threshold),
        time_limit_seconds = COALESCE(${time_limit_seconds}, time_limit_seconds),
        trigger_intents = COALESCE(${trigger_intents}, trigger_intents),
        custom_condition = COALESCE(${custom_condition ? JSON.stringify(custom_condition) : null}::jsonb, custom_condition),
        action = COALESCE(${action}, action),
        transfer_to = COALESCE(${transfer_to}, transfer_to),
        action_message = COALESCE(${action_message}, action_message),
        priority = COALESCE(${priority}, priority),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    if (updated.length === 0) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    return NextResponse.json(updated[0]);
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

    if (!id) {
      return NextResponse.json({ error: 'Rule ID required' }, { status: 400 });
    }

    await sql`DELETE FROM escalation_rules WHERE id = ${id}`;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting escalation rule:', error);
    return NextResponse.json(
      { error: 'Failed to delete escalation rule' },
      { status: 500 }
    );
  }
}
