// TODO: Replace this bootstrap placeholder with types generated from the reviewed
// Supabase schema before publishing the repository for PM review.
// Generate through the Supabase Dashboard or CLI against the development schema.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: Record<string, never>
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
