// app/api/extract-text/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parsePdfToLines } from "@/lib/parsers/pdf";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  console.log("[API /extract-text] Received request.");

  try {
    const form = await req.formData();
    const files = form.getAll("files") as File[];

    if (!files.length) {
      console.log("[API /extract-text] No files found in form data.");
      return NextResponse.json(
        { ok: false, error: "No files provided" },
        { status: 400 }
      );
    }

    console.log(`[API /extract-text] Found ${files.length} file(s).`);

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.error("[API /extract-text] Unauthorized: No user session found.");
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log(`[API /extract-text] Authenticated user: ${user.id}`);

    const processedFiles = await Promise.all(
      files.map(async (file) => {
        console.log(`[API /extract-text] Processing file: ${file.name}`);

        const ab = await file.arrayBuffer();
        const uint8 = new Uint8Array(ab);

        // 1) Parse PDF to raw text (no worker, server-safe)
        console.log(`[API /extract-text] Parsing PDF for ${file.name} ...`);
        const { lines, raw, engine, charCount } = await parsePdfToLines(uint8);
        const rawText = raw || lines.join("\n");
        console.log(
          `[API /extract-text] Parsed ${file.name} via ${engine}. chars=${charCount}`
        );

        // 2) Upload original PDF to Supabase storage
        const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
        // IMPORTANT: path is *inside* the bucket; do not prefix with "statements/"
        const filePath = `${user.id}/${crypto.randomUUID()}.${ext}`;

        console.log(
          `[API /extract-text] Uploading ${file.name} to ${filePath} ...`
        );

        const { error: storageError } = await supabase.storage
          .from("statements")
          .upload(filePath, ab, {
            contentType: "application/pdf",
            upsert: false,
          });

        if (storageError) {
          throw new Error(
            `Storage Error for ${file.name}: ${storageError.message}`
          );
        }

        console.log(`[API /extract-text] Uploaded ${file.name}.`);

        return {
          fileName: file.name,
          uploadData: {
            user_id: user.id,
            file_name: file.name,
            file_path: filePath,
            raw_text: rawText,
          },
        };
      })
    );

    // 3) Batch insert
    const insertPayload = processedFiles.map((p) => p.uploadData);
    console.log(
      `[API /extract-text] Inserting ${insertPayload.length} record(s) into 'uploads'.`
    );

    const { data: insertedData, error: insertError } = await supabase
      .from("uploads")
      .insert(insertPayload)
      .select("id, file_name, raw_text");

    if (insertError) {
      throw new Error(`DB Insert Error: ${insertError.message}`);
    }

    console.log(
      `[API /extract-text] Inserted ${insertedData.length} row(s).`
    );

    // 4) Prepare response
    const previewData = insertedData.map((row) => ({
      uploadId: row.id,
      fileName: row.file_name,
      preview: row.raw_text,
    }));

    return NextResponse.json({ ok: true, data: previewData });
  } catch (e: any) {
    console.error("[API /extract-text] Failed:", e);
    return NextResponse.json(
      {
        ok: false,
        error:
          e?.message ??
          "An unknown error occurred while extracting text from PDF(s).",
      },
      { status: 500 }
    );
  }
}
