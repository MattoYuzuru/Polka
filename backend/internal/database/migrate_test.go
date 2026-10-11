package database

import "testing"

func TestDemoMigrationsAreDevelopmentOnly(t *testing.T) {
	for _, name := range []string{"002_seed_demo_data.sql", "005_seed_book_notes.sql", "007_seed_recommendation_list_books.sql", "010_seed_demo_profile.sql"} {
		if shouldApplyMigration(name, false) {
			t.Errorf("production must not apply %s", name)
		}
		if !shouldApplyMigration(name, true) {
			t.Errorf("development must apply %s", name)
		}
	}
	for _, name := range []string{"001_init_schema.sql", "004_book_notes.sql", "009_books_cover_object_key.sql"} {
		if !shouldApplyMigration(name, false) {
			t.Errorf("production must apply schema migration %s", name)
		}
	}
}
