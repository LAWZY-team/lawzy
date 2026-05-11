import { Injectable } from '@nestjs/common';
import { supabase } from '../../config/supabase';

@Injectable()
export class CaseService {
  async createCase(data: { name: string; createdBy: string }) {
    const { data: caseData, error } = await supabase
      .from('cases')
      .insert({
        name: data.name,
        created_by: data.createdBy,
        status: 'draft',
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create case: ${error.message}`);
    return caseData;
  }

  async getCase(id: string) {
    const { data, error } = await supabase
      .from('cases')
      .select('*, general_info(*)')
      .eq('id', id)
      .single();

    if (error) throw new Error(`Failed to get case: ${error.message}`);
    return data;
  }

  async listCases() {
    const { data, error } = await supabase
      .from('cases')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to list cases: ${error.message}`);
    return data;
  }
}
