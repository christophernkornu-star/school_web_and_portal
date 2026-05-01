const fs = require('fs');

let content = fs.readFileSync('app/admin/settings/general/page.tsx', 'utf8');

const oldS = <select
                    required
                    value={formData.current_term}
                    onChange={(e) => setFormData({...formData, current_term: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-methodist-blue"
                  >
                    <option value="">Select Term</option>
                    <option value="Term 1">Term 1</option>
                    <option value="Term 2">Term 2</option>
                    <option value="Term 3">Term 3</option>
                  </select>
                  <p className="mt-1 text-[10px] md:text-xs text-gray-500">
                    Current active term for the school year
                  </p>;

const newS = <div className="relative">
                    <input
                      list="term-options"
                      required
                      value={formData.current_term}
                      onChange={(e) => setFormData({...formData, current_term: e.target.value})}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-methodist-blue"
                      placeholder="Select or type a term (e.g. Term 1)"
                    />
                    <datalist id="term-options">
                      {academicTerms.map(t => <option key={t} value={t} />)}
                      {!academicTerms.length && (
                        <>
                          <option value="Term 1" />
                          <option value="Term 2" />
                          <option value="Term 3" />
                        </>
                      )}
                    </datalist>
                  </div>
                  <p className="mt-1 text-[10px] md:text-xs text-gray-500">
                    Type a new name to create a term, or select an existing active term.
                  </p>;

content = content.replace(oldS, newS);

// Now let's fix the logic where termId exists:
const oldLogic = // Also ensure is_current flag is set correctly in academic_terms
        await supabase
          .from('academic_terms')
          .update({ is_current: false })
          .neq('id', termId)
          
        await supabase
          .from('academic_terms')
          .update({ is_current: true })
          .eq('id', termId);

const newLogic = // Also ensure is_current flag and dates are set correctly in academic_terms
        await supabase
          .from('academic_terms')
          .update({ is_current: false })
          .neq('id', termId)
          
        await supabase
          .from('academic_terms')
          .update({ 
            is_current: true,
            start_date: formData.term_start_date || null,
            end_date: formData.term_end_date || null
          })
          .eq('id', termId);

content = content.replace(oldLogic, newLogic);
fs.writeFileSync('app/admin/settings/general/page.tsx', content);

