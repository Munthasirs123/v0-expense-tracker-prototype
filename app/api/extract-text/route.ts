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
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.error("[API /extract-text] Unauthorized: No user session found.");
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    console.log(`[API /extract-text] Authenticated user: ${user.id}`);
    
    // Process all files in parallel for better performance
    const processedFiles = await Promise.all(
      files.map(async (file) => {
        console.log(`[API /extract-text] Processing file: ${file.name}`);
        const uint8 = new Uint8Array(await file.arrayBuffer());
        
        // 1. Parse PDF to raw text
        console.log(`[API /extract-text] Starting PDF parsing for ${file.name}...`);
        const { lines, raw } = await parsePdfToLines(uint8);
        const rawText = raw || lines.join("\n");
        console.log(
          `[API /extract-text] Finished PDF parsing for ${file.name}. Extracted ${rawText.length} characters.`
        );
        
        // 2. Upload original PDF to Supabase Storage
        const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
        const filePath = `statements/${user.id}/${crypto.randomUUID()}.${ext}`;
        console.log(`[API /extract-text] Uploading ${file.name} to storage at ${filePath}...`);
        
        const { error: storageError } = await supabase.storage
          .from("statements")
          .upload(filePath, uint8, {
            contentType: "application/pdf",
            upsert: false,
          });
        
        if (storageError) {
          throw new Error(`Storage Error for ${file.name}: ${storageError.message}`);
        }
        
        console.log(`[API /extract-text] Successfully uploaded ${file.name}.`);
        
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
    
    // 3. Insert all upload records into the database in a single batch
    const insertPayload = processedFiles.map(p => p.uploadData);
    console.log(
      `[API /extract-text] Batch inserting ${insertPayload.length} records into 'uploads' table.`
    );
    
    const { data: insertedData, error: insertError } = await supabase
      .from("uploads")
      .insert(insertPayload)
      .select("id, file_name, raw_text");
    
    if (insertError) {
      throw new Error(`DB Insert Error: ${insertError.message}`);
    }
    
    console.log(
      `[API /extract-text] Successfully inserted records. Got ${insertedData.length} rows back.`
    );
    
    // 4. Prepare and send the response for the frontend
    const previewData = insertedData.map(row => ({
      uploadId: row.id,
      fileName: row.file_name,
      preview: row.raw_text,
    }));
    
    console.log("[API /extract-text] Request successful. Sending preview data.");
    return NextResponse.json({ ok: true, data: previewData });
    
  } catch (e: any) {
    console.error("[API /extract-text] A critical error occurred:", e);
    return NextResponse.json(
      { ok: false, error: e.message || "An unknown error occurred in extract-text." },
      { status: 500 }
    );
  }
}