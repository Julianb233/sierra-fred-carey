import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

// GET - Fetch knowledge base entries
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const configId = searchParams.get('config_id');
    const category = searchParams.get('category');
    const entryType = searchParams.get('entry_type');
    const supabase = createServiceClient();

    let query = supabase
      .from('knowledge_base')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    if (configId) {
      query = query.eq('config_id', configId);
    }
    if (category) {
      query = query.eq('category', category);
    }
    if (entryType) {
      query = query.eq('entry_type', entryType);
    }

    const { data, error } = await query;

    if (error) throw error;
    return NextResponse.json(data || []);
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
    const supabase = createServiceClient();

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

    const { data, error } = await supabase
      .from('knowledge_base')
      .insert({
        config_id,
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
        priority,
        created_by
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
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
    const supabase = createServiceClient();

    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'Entry ID required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('knowledge_base')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    return NextResponse.json(data);
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
    const supabase = createServiceClient();

    if (!id) {
      return NextResponse.json({ error: 'Entry ID required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('knowledge_base')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting knowledge base entry:', error);
    return NextResponse.json(
      { error: 'Failed to delete knowledge base entry' },
      { status: 500 }
    );
  }
}
