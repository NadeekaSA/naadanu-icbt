const { createClient } = require('@supabase/supabase-js');

// Get these from your .env file
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://poqluszkidooymmjzrrjc.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvcWx1c3praWRvb3ltbWp6cmpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxOTMzODAsImV4cCI6MjA3NTc2OTM4MH0.rzrFqKPbe6CmeJYFGT_wQ0FOpDE3pzZwr7RQ5KrcNtg';

console.log('Supabase URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkTables() {
  console.log('Checking if tables exist...');
  
  try {
    // Check if participants table exists
    const { data: participantsData, error: participantsError } = await supabase
      .from('participants')
      .select('count()');
    
    if (participantsError) {
      console.log('❌ Error accessing participants table:', participantsError.message);
    } else {
      console.log('✅ Participants table exists');
    }
    
    // Check if categories table exists
    const { data: categoriesData, error: categoriesError } = await supabase
      .from('categories')
      .select('count()');
    
    if (categoriesError) {
      console.log('❌ Error accessing categories table:', categoriesError.message);
    } else {
      console.log('✅ Categories table exists');
    }
    
    // Check if final_performances table exists
    const { data: performancesData, error: performancesError } = await supabase
      .from('final_performances')
      .select('count()');
    
    if (performancesError) {
      console.log('❌ Error accessing final_performances table:', performancesError.message);
      console.log('This is expected if the migration hasn\'t been applied yet');
    } else {
      console.log('✅ final_performances table exists');
    }
    
    // Check if performance_votes table exists
    const { data: votesData, error: votesError } = await supabase
      .from('performance_votes')
      .select('count()');
    
    if (votesError) {
      console.log('❌ Error accessing performance_votes table:', votesError.message);
      console.log('This is expected if the migration hasn\'t been applied yet');
    } else {
      console.log('✅ performance_votes table exists');
    }
    
  } catch (err) {
    console.error('Connection test failed:', err);
  }
}

checkTables();