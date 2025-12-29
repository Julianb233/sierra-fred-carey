import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

// GET - Fetch knowledge base entries
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const configId = searchParams.get('config_id');
    const category = searchParams.get('category');
    const entryType = searchParams.get('entry_type');

    let entries;
    if (configId) {
      if (category && entryType) {
        entries = await sql`
          SELECT * FROM knowledge_base
          WHERE config_id = ${configId}
          AND category = ${category}
          AND entry_type = ${entryType}
          AND is_active = true
          ORDER BY priority DESC, created_at DESC
        `;
      } else if (category) {
        entries = await sql`
          SELECT * FROM knowledge_base
          WHERE config_id = ${configId}
          AND category = ${category}
          AND is_active = true
          ORDER BY priority DESC, created_at DESC
        `;
      } else if (entryType) {
        entries = await sql`
          SELECT * FROM knowledge_base
          WHERE config_id = ${configId}
          AND entry_type = ${entryType}
          AND is_active = true
          ORDER BY priority DESC, created_at DESC
        `;
      } else {
        entries = await sql`
          SELECT * FROM knowledge_base
          WHERE config_id = ${configId}
          AND is_active = true
          ORDER BY priority DESC, created_at DESC
        `;
      }
    } else {
      // Get entries for the default active config
      entries = await sql`
        SELECT kb.* FROM knowledge_base kb
        JOIN voice_agent_config vac ON kb.config_id = vac.id
        WHERE vac.is_active = true AND kb.is_active = true
        ORDER BY kb.priority DESC, kb.created_at DESC
      `;
    }

    return NextResponse.json(entries);
  } catch (error) {
    console.error('Error fetching knowledge base:', error);
    return NextResponse.json(
      { error: 'Failed to fetch knowledge base' },
      { status: 500 }
    );
  }
}

// POST - Create new knowledge base entry
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      config_id,
      entry_type = 'faq',
      question,
      answer,
      document_title,
      document_content,
      document_url,
      product_name,
      product_description,
      product_price,
      product_features,
      category,
      tags,
      search_keywords,
      priority = 0,
      created_by
    } = body;

    if (!config_id) {
      return NextResponse.json({ error: 'config_id is required' }, { status: 400 });
    }

    const created = await sql`
      INSERT INTO knowledge_base (
        config_id, entry_type, question, answer,
        document_title, document_content, document_url,
        product_name, product_description, product_price, product_features,
        category, tags, search_keywords, priority, created_by
      ) VALUES (
        ${config_id}, ${entry_type}, ${question}, ${answer},
        ${document_title}, ${document_content}, ${document_url},
        ${product_name}, ${product_description}, ${product_price}, ${product_features || null},
        ${category}, ${tags || null}, ${search_keywords || null}, ${priority}, ${created_by}
      )
      RETURNING *
    `;

    return NextResponse.json(created[0], { status: 201 });
  } catch (error) {
    console.error('Error creating knowledge base entry:', error);
    return NextResponse.json(
      { error: 'Failed to create knowledge base entry' },
      { status: 500 }
    );
  }
}

// PUT - Update knowledge base entry
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      entry_type,
      question,
      answer,
      document_title,
      document_content,
      document_url,
      product_name,
      product_description,
      product_price,
      product_features,
      category,
      tags,
      search_keywords,
      is_active,
      priority
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Entry ID required' }, { status: 400 });
    }

    const updated = await sql`
      UPDATE knowledge_base
      SET
        entry_type = COALESCE(${entry_type}, entry_type),
        question = COALESCE(${question}, question),
        answer = COALESCE(${answer}, answer),
        document_title = COALESCE(${document_title}, document_title),
        document_content = COALESCE(${document_content}, document_content),
        document_url = COALESCE(${document_url}, document_url),
        product_name = COALESCE(${product_name}, product_name),
        product_description = COALESCE(${product_description}, product_description),
        product_price = COALESCE(${product_price}, product_price),
        product_features = COALESCE(${product_features}, product_features),
        category = COALESCE(${category}, category),
        tags = COALESCE(${tags}, tags),
        search_keywords = COALESCE(${search_keywords}, search_keywords),
        is_active = COALESCE(${is_active}, is_active),
        priority = COALESCE(${priority}, priority),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    if (updated.length === 0) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    return NextResponse.json(updated[0]);
  } catch (error) {
    console.error('Error updating knowledge base entry:', error);
    return NextResponse.json(
      { error: 'Failed to update knowledge base entry' },
      { status: 500 }
    );
  }
}

// DELETE - Delete knowledge base entry
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Entry ID required' }, { status: 400 });
    }

    await sql`DELETE FROM knowledge_base WHERE id = ${id}`;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting knowledge base entry:', error);
    return NextResponse.json(
      { error: 'Failed to delete knowledge base entry' },
      { status: 500 }
    );
  }
}
