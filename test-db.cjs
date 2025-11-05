const { createClient } = require('@supabase/supabase-js');

// Get these from your .env file
const supabaseUrl = 'https://poqluszkidooymmjzrrjc.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvcWx1c3praWRvb3ltbWp6cmpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxOTMzODAsImV4cCI6MjA3NTc2OTM4MH0.rzrFqKPbe6CmeJYFGT_wQ0FOpDE3pzZwr7RQ5KrcNtg';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  console.log('Testing Supabase connection...');
  
  // Test if we can access the tables
  try {
    const { data, error } = await supabase
      .from('final_performances')
      .select('id')
      .limit(1);
    
    if (error) {
      console.log('Error accessing final_performances table:', error);
    } else {
      console.log('Successfully accessed final_performances table');
    }
    
    // Check if participants table exists
    const { data: participantsData, error: participantsError } = await supabase
      .from('participants')
      .select('id')
      .limit(1);
    
    if (participantsError) {
      console.log('Error accessing participants table:', participantsError);
    } else {
      console.log('Successfully accessed participants table');
    }
    
    // Check if categories table exists
    const { data: categoriesData, error: categoriesError } = await supabase
      .from('categories')
      .select('id')
      .limit(1);
    
    if (categoriesError) {
      console.log('Error accessing categories table:', categoriesError);
    } else {
      console.log('Successfully accessed categories table');
    }
  } catch (err) {
    console.error('Connection test failed:', err);
  }
}

testConnection();