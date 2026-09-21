import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const uploadAndParseWorkbook = async (file) => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('User not authenticated.');

    const filePath = `${user.id}/${Date.now()}_${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from('workbooks')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: workbook, error: workbookError } = await supabase
      .from('workbooks')
      .insert({
        user_id: user.id,
        name: file.name,
        file_path: filePath,
        file_size: file.size,
      })
      .select()
      .single();

    if (workbookError) throw workbookError;

    const arrayBuffer = await file.arrayBuffer();
    const workbookData = XLSX.read(arrayBuffer, { type: 'array' });
    
    const datasetsToInsert = [];

    for (const sheetName of workbookData.SheetNames) {
      const sheet = workbookData.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      if (jsonData.length > 0) {
        const headers = jsonData[0] || [];
        const rows = jsonData.slice(1).map((row) => {
          const rowObj = {};
          headers.forEach((header, index) => {
            rowObj[header || `col_${index}`] = row[index] !== undefined ? row[index] : null;
          });
          return rowObj;
        });

        datasetsToInsert.push({
          workbook_id: workbook.id,
          sheet_name: sheetName,
          headers: headers,
          rows: rows,
          row_count: rows.length,
        });
      }
    }

    if (datasetsToInsert.length > 0) {
      const { error: datasetError } = await supabase
        .from('datasets')
        .insert(datasetsToInsert);

      if (datasetError) throw datasetError;
    }

    return { success: true, workbookId: workbook.id };
  } catch (error) {
    console.error('Error uploading and parsing workbook:', error);
    return { success: false, error: error.message };
  }
};

export const getUserWorkbooks = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('workbooks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching workbooks:', error);
    return [];
  }
};

export const getWorkbookDatasets = async (workbookId) => {
  try {
    const { data, error } = await supabase
      .from('datasets')
      .select('*')
      .eq('workbook_id', workbookId);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching workbook datasets:', error);
    return [];
  }
};