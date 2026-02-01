import { NextRequest, NextResponse } from 'next/server'
import { createClient } from './supabase/server'
import type { Database } from './supabase/types'
import type { TablesInsert, TablesUpdate } from './supabase/types'

type TableNames = keyof Database['public']['Tables']

export function createCrudHandlers<T extends TableNames>(
  tableName: T,
  singularName: string
) {
  return {
    getAll: async () => {
      try {
        const supabase = await createClient()
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .order('created_at', { ascending: false })

        if (error) throw error
        return NextResponse.json(data)
      } catch (error) {
        console.error(`Error fetching ${singularName}s:`, error)
        return NextResponse.json(
          { error: `Failed to fetch ${singularName}s` },
          { status: 500 }
        )
      }
    },

    create: async (request: NextRequest) => {
      try {
        const body = await request.json()
        const supabase = await createClient()
        const { data, error } = await supabase
          .from(tableName)
          .insert(body as TablesInsert<typeof tableName>)
          .select()
          .single()

        if (error) throw error
        return NextResponse.json(data)
      } catch (error) {
        console.error(`Error creating ${singularName}:`, error)
        return NextResponse.json(
          { error: `Failed to create ${singularName}` },
          { status: 500 }
        )
      }
    },

    update: async (request: NextRequest) => {
      try {
        const body = await request.json()
        const { id, ...data } = body
        if (!id) {
          return NextResponse.json(
            { error: 'ID is required' },
            { status: 400 }
          )
        }
        const supabase = await createClient()
        const { data: updated, error } = await supabase
          .from(tableName)
          .update(data as TablesUpdate<typeof tableName>)
          .eq('id', id)
          .select()
          .single()

        if (error) throw error
        return NextResponse.json(updated)
      } catch (error) {
        console.error(`Error updating ${singularName}:`, error)
        return NextResponse.json(
          { error: `Failed to update ${singularName}` },
          { status: 500 }
        )
      }
    },

    delete: async (request: NextRequest) => {
      try {
        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')
        if (!id) {
          return NextResponse.json(
            { error: 'ID is required' },
            { status: 400 }
          )
        }
        const supabase = await createClient()
        const { error } = await supabase
          .from(tableName)
          .delete()
          .eq('id', id)

        if (error) throw error
        return NextResponse.json({ success: true })
      } catch (error) {
        console.error(`Error deleting ${singularName}:`, error)
        return NextResponse.json(
          { error: `Failed to delete ${singularName}` },
          { status: 500 }
        )
      }
    },
  }
}
