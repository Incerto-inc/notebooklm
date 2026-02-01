import { NextRequest } from 'next/server';
import { createCrudHandlers } from '@/lib/supabase-api-utils';

const handlers = createCrudHandlers('sources', 'source');

export const GET = handlers.getAll;
export const POST = handlers.create;
export const PUT = handlers.update;
export const DELETE = handlers.delete;
