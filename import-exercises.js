// ================================
// EXERCISES JSON IMPORT SCRIPT
// Updated for byBodyPart structure
// ================================

require("dotenv").config();
const { neon } = require("@neondatabase/serverless");
const fs = require("fs");

const sql = neon(process.env.POSTGRES_URL);

async function importExercises() {
  try {
    // Read your exercises.json file
    console.log("Reading exercises.json...");
    const data = JSON.parse(fs.readFileSync("./exercises.json", "utf8"));
    
    console.log(`Total exercises in file: ${data.totalExercises}`);
    console.log(`Extracted at: ${data.extractedAt}\n`);
    console.log("Starting import...\n");

    let successCount = 0;
    let failCount = 0;
    let totalProcessed = 0;

    // Loop through each body part
    for (const bodyPart in data.byBodyPart) {
      const exercises = data.byBodyPart[bodyPart];
      
      console.log(`Importing ${exercises.length} ${bodyPart} exercises...`);

      for (const ex of exercises) {
        try {
          // Convert instructions array to string if needed
          const instructions = Array.isArray(ex.instructions) 
            ? ex.instructions.join(" ") 
            : ex.instructions;

          // Insert exercise
          await sql`
            INSERT INTO exercises (
              id, 
              name, 
              body_part, 
              target_muscle, 
              equipment,
              difficulty, 
              exercise_type, 
              instructions, 
              secondary_muscles,
              met_value, 
              source
            ) VALUES (
              ${ex.id},
              ${ex.name},
              ${ex.bodyPart || bodyPart},
              ${ex.target || ex.muscle},
              ${ex.equipment},
              ${ex.difficulty || 'intermediate'},
              ${ex.type || 'strength'},
              ${instructions},
              ${JSON.stringify(ex.secondaryMuscles || [])},
              6.0,
              'ExerciseDB'
            )
            ON CONFLICT (id) DO UPDATE SET
              name = EXCLUDED.name,
              body_part = EXCLUDED.body_part,
              target_muscle = EXCLUDED.target_muscle,
              equipment = EXCLUDED.equipment,
              difficulty = EXCLUDED.difficulty,
              exercise_type = EXCLUDED.exercise_type,
              instructions = EXCLUDED.instructions,
              secondary_muscles = EXCLUDED.secondary_muscles
          `;

          successCount++;
          totalProcessed++;

          // Progress indicator
          if (totalProcessed % 50 === 0) {
            console.log(`✅ Progress: ${totalProcessed}/${data.totalExercises} exercises imported`);
          }

        } catch (error) {
          console.error(`❌ Failed to import exercise ${ex.id} (${ex.name}):`, error.message);
          failCount++;
        }
      }
    }

    console.log("\n================================");
    console.log("IMPORT COMPLETE!");
    console.log(`Total exercises: ${data.totalExercises}`);
    console.log(`Successfully imported: ${successCount}`);
    console.log(`Failed: ${failCount}`);
    console.log("================================\n");

    // Verification query
    console.log("Verifying import...\n");
    
    const bodyPartCounts = await sql`
      SELECT body_part, COUNT(*) as count 
      FROM exercises 
      GROUP BY body_part 
      ORDER BY body_part
    `;

    console.log("Exercises by body part:");
    bodyPartCounts.forEach(row => {
      console.log(`  ${row.body_part}: ${row.count}`);
    });

    const equipmentCounts = await sql`
      SELECT equipment, COUNT(*) as count 
      FROM exercises 
      GROUP BY equipment 
      ORDER BY count DESC
      LIMIT 5
    `;

    console.log("\nTop 5 equipment types:");
    equipmentCounts.forEach(row => {
      console.log(`  ${row.equipment}: ${row.count}`);
    });

    console.log("\n✅ All done! Next step: Run met-values-assignment.sql");

  } catch (error) {
    console.error("Import error:", error);
  }
}

// Run the import
importExercises();