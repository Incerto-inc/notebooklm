import { NextRequest } from 'next/server';
import { createCrudHandlers } from '@/lib/api-utils';

const handlers = createCrudHandlers('Source', 'source');

export const GET = handlers.getAll;
export const POST = handlers.create;
export const PUT = handlers.update;
export const DELETE = handlers.delete;
