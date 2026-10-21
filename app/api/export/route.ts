import { NextRequest, NextResponse } from 'next/server';
import { generateComparisonExcelBuffer } from '@/lib/excelExport';
import { FareComparisonResponse } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const data: FareComparisonResponse = await request.json();

    if (!data || !data.pickup || !data.drop || !data.rides) {
      return NextResponse.json(
        { error: 'Valid FareComparisonResponse payload required for Excel generation' },
        { status: 400 }
      );
    }

    const buffer = generateComparisonExcelBuffer(data);
    const citySlug = data.city?.split(',')?.[0]?.trim()?.toLowerCase()?.replace(/[^a-z0-9]/g, '') || 'report';
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `camparify-comparison-${citySlug}-${timestamp}.xlsx`;

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
