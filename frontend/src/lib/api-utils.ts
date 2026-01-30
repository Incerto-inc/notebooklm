import { NextRequest, NextResponse } from 'next/server';
import { prisma } from './prisma';
import type { Prisma } from '@prisma/client';

/**
 * 共通CRUDハンドラーを作成するユーティリティ関数
 *
 * @param model - Prismaモデル名（'style' | 'source' | 'scenario' | 'chatMessage'）
 * @param singularName - 単数形の名前（エラーメッセージ用）
 * @returns CRUDハンドラーオブジェクト
 */
export function createCrudHandlers<T extends Prisma.ModelName>(
  model: T,
  singularName: string
) {
  // Prismaクライアントの動的アクセス用型定義
  type PrismaModel = {
    findMany: (args?: any) => Promise<any[]>;
    create: (args: { data: any }) => Promise<any>;
    update: (args: { where: { id: string }; data: any }) => Promise<any>;
    delete: (args: { where: { id: string } }) => Promise<any>;
  };

  const getModel = (): PrismaModel => {
    const modelKey = model.charAt(0).toLowerCase() + model.slice(1);
    return (prisma as any)[modelKey];
  };

  return {
    /**
     * GET /api/{model} - すべてのレコードを取得
     */
    getAll: async () => {
      try {
        const dbModel = getModel();
        const records = await dbModel.findMany({
          orderBy: { createdAtDateTime: 'desc' as const },
        });
        return NextResponse.json(records);
      } catch (error) {
        console.error(`Error fetching ${singularName}s:`, error);
        return NextResponse.json(
          { error: `Failed to fetch ${singularName}s` },
          { status: 500 }
        );
      }
    },

    /**
     * POST /api/{model} - 新しいレコードを作成
     */
    create: async (request: NextRequest) => {
      try {
        const body = await request.json();
        const dbModel = getModel();
        const record = await dbModel.create({
          data: body,
        });
        return NextResponse.json(record);
      } catch (error) {
        console.error(`Error creating ${singularName}:`, error);
        return NextResponse.json(
          { error: `Failed to create ${singularName}` },
          { status: 500 }
        );
      }
    },

    /**
     * PUT /api/{model} - レコードを更新
     */
    update: async (request: NextRequest) => {
      try {
        const body = await request.json();
        const { id, ...data } = body;
        if (!id) {
          return NextResponse.json(
            { error: 'ID is required' },
            { status: 400 }
          );
        }
        const dbModel = getModel();
        const record = await dbModel.update({
          where: { id },
          data,
        });
        return NextResponse.json(record);
      } catch (error) {
        console.error(`Error updating ${singularName}:`, error);
        return NextResponse.json(
          { error: `Failed to update ${singularName}` },
          { status: 500 }
        );
      }
    },

    /**
     * DELETE /api/{model} - レコードを削除
     */
    delete: async (request: NextRequest) => {
      try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) {
          return NextResponse.json(
            { error: 'ID is required' },
            { status: 400 }
          );
        }
        const dbModel = getModel();
        await dbModel.delete({
          where: { id },
        });
        return NextResponse.json({ success: true });
      } catch (error) {
        console.error(`Error deleting ${singularName}:`, error);
        return NextResponse.json(
          { error: `Failed to delete ${singularName}` },
          { status: 500 }
        );
      }
    },
  };
}
