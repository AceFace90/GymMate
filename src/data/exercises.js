// Built-in exercise library — seeded into SQLite on first launch
// muscleGroup: chest | back | legs | shoulders | arms | core | cardio | full_body
// category:    barbell | dumbbell | machine | cable | bodyweight | cardio

export const BUILT_IN_EXERCISES = [
  // ── CHEST ──────────────────────────────────────────────────────────────────
  { name: 'Barbell Bench Press', muscleGroup: 'chest', category: 'barbell', instructions: 'Lie on bench, grip bar slightly wider than shoulder-width. Lower bar to lower chest, press up.' },
  { name: 'Incline Barbell Bench Press', muscleGroup: 'chest', category: 'barbell', instructions: 'Set bench to 30-45°. Grip slightly wider than shoulder-width. Lower to upper chest.' },
  { name: 'Decline Barbell Bench Press', muscleGroup: 'chest', category: 'barbell', instructions: 'Set bench to -15 to -30°. Focus on lower chest.' },
  { name: 'Dumbbell Bench Press', muscleGroup: 'chest', category: 'dumbbell', instructions: 'Lie on bench with dumbbells at chest level, press up and together.' },
  { name: 'Incline Dumbbell Press', muscleGroup: 'chest', category: 'dumbbell', instructions: 'Set bench to 30-45°. Press dumbbells up and together at the top.' },
  { name: 'Dumbbell Flye', muscleGroup: 'chest', category: 'dumbbell', instructions: 'Lie on bench, arms extended. Lower with slight elbow bend, stretch chest, bring back up in an arc.' },
  { name: 'Cable Chest Flye', muscleGroup: 'chest', category: 'cable', instructions: 'Set pulleys at shoulder height. Bring handles together in front of chest with slight arm bend.' },
  { name: 'Push-Up', muscleGroup: 'chest', category: 'bodyweight', instructions: 'Hands shoulder-width, body straight. Lower chest to floor, push back up.' },
  { name: 'Scapular Push-Up', muscleGroup: 'chest', category: 'bodyweight', instructions: 'High plank position. Protract and retract shoulder blades without bending elbows. Serratus activation.' },
  { name: 'Chest Dip', muscleGroup: 'chest', category: 'bodyweight', instructions: 'Lean forward on dip bars to emphasise chest. Lower until shoulders are below elbows.' },
  { name: 'Machine Chest Press', muscleGroup: 'chest', category: 'machine', instructions: 'Seat height so handles are at chest level. Press forward, squeeze chest at peak.' },
  { name: 'Pec Deck', muscleGroup: 'chest', category: 'machine', instructions: 'Forearms on pads, bring arms together in front of chest, squeeze and return slowly.' },

  // ── BACK ───────────────────────────────────────────────────────────────────
  { name: 'Barbell Deadlift', muscleGroup: 'back', category: 'barbell', instructions: 'Bar over mid-foot, hinge at hips, flat back, drive hips forward to stand. Lock out at top.' },
  { name: 'Romanian Deadlift', muscleGroup: 'back', category: 'barbell', instructions: 'Soft knee bend, hinge at hips pushing them back, lower bar along legs, feel hamstring stretch.' },
  { name: 'Barbell Row', muscleGroup: 'back', category: 'barbell', instructions: 'Hinge forward ~45°. Pull bar to lower abdomen, retract scapulae, lower with control.' },
  { name: 'Pendlay Row', muscleGroup: 'back', category: 'barbell', instructions: 'Torso parallel to floor. Pull bar explosively from floor to chest, return to floor each rep.' },
  { name: 'Pull-Up', muscleGroup: 'back', category: 'bodyweight', instructions: 'Overhand grip slightly wider than shoulders. Pull chest to bar, lower fully.' },
  { name: 'Chin-Up', muscleGroup: 'back', category: 'bodyweight', instructions: 'Underhand grip shoulder-width. Pull chin above bar, emphasises biceps.' },
  { name: 'Lat Pulldown', muscleGroup: 'back', category: 'cable', instructions: 'Wide overhand grip. Pull bar to upper chest, elbows drive down toward sides.' },
  { name: 'Seated Cable Row', muscleGroup: 'back', category: 'cable', instructions: 'Sit upright, pull handle to abdomen, squeeze shoulder blades. Return with control.' },
  { name: 'Single-Arm Dumbbell Row', muscleGroup: 'back', category: 'dumbbell', instructions: 'Brace on bench, row dumbbell to hip, elbow close to body. Full stretch at bottom.' },
  { name: 'T-Bar Row', muscleGroup: 'back', category: 'barbell', instructions: 'Straddle bar, grip handles, hinge forward, row bar to lower chest.' },
  { name: 'Machine Row', muscleGroup: 'back', category: 'machine', instructions: 'Chest on pad, pull handles to sides, squeeze shoulder blades together.' },
  { name: 'Dumbbell Pullover', muscleGroup: 'back', category: 'dumbbell', instructions: 'Lie across bench, hold dumbbell overhead, lower behind head with straight arms, return.' },

  // ── LEGS ───────────────────────────────────────────────────────────────────
  { name: 'Barbell Back Squat', muscleGroup: 'legs', category: 'barbell', instructions: 'Bar on upper traps. Feet shoulder-width, toes out slightly. Squat to parallel or below, drive up.' },
  { name: 'Barbell Front Squat', muscleGroup: 'legs', category: 'barbell', instructions: 'Bar on front deltoids. Elbows high, upright torso. Squat to parallel.' },
  { name: 'Single-Leg Romanian Deadlift', muscleGroup: 'legs', category: 'dumbbell', instructions: 'Stand on one leg, hinge forward with slight knee bend. Lower weight toward floor, return. Balance + hamstring.' },
  { name: 'Single-Leg Hip Thrust', muscleGroup: 'legs', category: 'bodyweight', instructions: 'Upper back on bench, one leg extended. Drive through heel, extend hip fully, squeeze glute.' },
  { name: 'Leg Press', muscleGroup: 'legs', category: 'machine', instructions: 'Feet shoulder-width on platform. Lower sled until knees near 90°, press up without locking.' },
  { name: 'Hack Squat', muscleGroup: 'legs', category: 'machine', instructions: 'Shoulders on pads, feet on platform. Lower until thighs parallel, press up.' },
  { name: 'Bulgarian Split Squat', muscleGroup: 'legs', category: 'dumbbell', instructions: 'Rear foot elevated, front foot forward. Drop rear knee toward floor, keep torso upright.' },
  { name: 'Dumbbell Lunge', muscleGroup: 'legs', category: 'dumbbell', instructions: 'Step forward, lower back knee toward floor, push through front heel to return.' },
  { name: 'Walking Lunge', muscleGroup: 'legs', category: 'bodyweight', instructions: 'Lunge forward alternating legs, travelling across the floor.' },
  { name: 'Leg Extension', muscleGroup: 'legs', category: 'machine', instructions: 'Sit with pads on shins. Extend knees fully, pause, lower slowly. Isolates quads.' },
  { name: 'Lying Leg Curl', muscleGroup: 'legs', category: 'machine', instructions: 'Lie prone, pads on ankles. Curl heels toward glutes, lower with control.' },
  { name: 'Seated Leg Curl', muscleGroup: 'legs', category: 'machine', instructions: 'Thighs flat on seat, pads on shins. Curl under seat, squeeze at bottom.' },
  { name: 'Romanian Deadlift (Dumbbell)', muscleGroup: 'legs', category: 'dumbbell', instructions: 'Hold dumbbells in front of thighs, hinge at hips, feel hamstring stretch, return.' },
  { name: 'Good Morning', muscleGroup: 'legs', category: 'barbell', instructions: 'Bar on upper traps. Hinge at hips, back flat, lower torso toward parallel, return.' },
  { name: 'Standing Calf Raise', muscleGroup: 'legs', category: 'machine', instructions: 'Shoulders on pads, balls of feet on edge. Rise onto toes, pause, lower fully.' },
  { name: 'Seated Calf Raise', muscleGroup: 'legs', category: 'machine', instructions: 'Pads on thighs, balls of feet on edge. Rise onto toes, pause, lower to full stretch.' },
  { name: 'Hip Thrust', muscleGroup: 'legs', category: 'barbell', instructions: 'Upper back on bench, bar on hips. Drive hips up to full extension, squeeze glutes.' },
  { name: 'Cable Glute Kickback', muscleGroup: 'legs', category: 'cable', instructions: 'Ankle strap on cable. Kick leg back, squeeze glute at top, control return. Glute isolation.' },
  { name: 'Goblet Squat', muscleGroup: 'legs', category: 'dumbbell', instructions: 'Hold dumbbell at chest, feet shoulder-width. Squat deep keeping chest up.' },

  // ── SHOULDERS ──────────────────────────────────────────────────────────────
  { name: 'Barbell Overhead Press', muscleGroup: 'shoulders', category: 'barbell', instructions: 'Bar at shoulder height, grip just outside shoulders. Press overhead to lockout, lower to chin.' },
  { name: 'Seated Dumbbell Press', muscleGroup: 'shoulders', category: 'dumbbell', instructions: 'Sit upright, dumbbells at ear height. Press up and together, lower back with control.' },
  { name: 'Dumbbell Lateral Raise', muscleGroup: 'shoulders', category: 'dumbbell', instructions: 'Slight bend in elbows. Raise arms to shoulder height, pinky slightly higher, lower slowly.' },
  { name: 'Cable Lateral Raise', muscleGroup: 'shoulders', category: 'cable', instructions: 'Cable at hip height, raise arm to shoulder level, hold briefly, lower.' },
  { name: 'Front Raise', muscleGroup: 'shoulders', category: 'dumbbell', instructions: 'Arms in front of thighs. Raise to shoulder height with slight elbow bend, lower.' },
  { name: 'Face Pull', muscleGroup: 'shoulders', category: 'cable', instructions: 'Cable at upper chest. Pull rope to face with elbows flared, retract shoulder blades.' },
  { name: 'Reverse Pec Deck', muscleGroup: 'shoulders', category: 'machine', instructions: 'Face the machine, arms in front. Open arms wide to sides, squeeze rear delts.' },
  { name: 'Dumbbell Shrug', muscleGroup: 'shoulders', category: 'dumbbell', instructions: 'Dumbbells at sides. Shrug shoulders straight up, hold briefly, lower fully.' },
  { name: 'Upright Row', muscleGroup: 'shoulders', category: 'barbell', instructions: 'Narrow overhand grip. Pull bar up to chin, elbows flare high and wide.' },
  { name: 'Arnold Press', muscleGroup: 'shoulders', category: 'dumbbell', instructions: 'Start with palms facing you, rotate to face away as you press overhead.' },

  // ── ARMS — BICEPS ──────────────────────────────────────────────────────────
  { name: 'Barbell Curl', muscleGroup: 'arms', category: 'barbell', instructions: 'Supinated grip, elbows at sides. Curl bar to chest without swinging, lower with control.' },
  { name: 'EZ-Bar Curl', muscleGroup: 'arms', category: 'barbell', instructions: 'Use angled grip on EZ-bar. Curl to upper chest, squeeze bicep at top.' },
  { name: 'Dumbbell Curl', muscleGroup: 'arms', category: 'dumbbell', instructions: 'Alternate or simultaneous. Supinate wrist at top of movement for full bicep contraction.' },
  { name: 'Hammer Curl', muscleGroup: 'arms', category: 'dumbbell', instructions: 'Neutral grip (thumbs up). Curl to shoulder height, targets brachialis.' },
  { name: 'Incline Dumbbell Curl', muscleGroup: 'arms', category: 'dumbbell', instructions: 'Bench at 45°. Arms hang straight, curl dumbbells, extra stretch at bottom.' },
  { name: 'Cable Curl', muscleGroup: 'arms', category: 'cable', instructions: 'Low cable, curl bar or rope to chin level. Constant tension through full range.' },
  { name: 'Preacher Curl', muscleGroup: 'arms', category: 'machine', instructions: 'Upper arm on pad. Curl through full range, lower slowly for stretch.' },
  { name: 'Concentration Curl', muscleGroup: 'arms', category: 'dumbbell', instructions: 'Seated, elbow on inner thigh. Curl dumbbell to shoulder, squeeze at top.' },

  // ── ARMS — TRICEPS ─────────────────────────────────────────────────────────
  { name: 'Close-Grip Bench Press', muscleGroup: 'arms', category: 'barbell', instructions: 'Grip shoulder-width. Lower to lower chest with elbows tucked, press up.' },
  { name: 'Tricep Dip', muscleGroup: 'arms', category: 'bodyweight', instructions: 'Torso upright on dip bars. Lower until upper arms parallel, press back up.' },
  { name: 'Cable Tricep Pushdown', muscleGroup: 'arms', category: 'cable', instructions: 'High cable with bar or rope. Extend elbows fully, squeeze triceps, return to 90°.' },
  { name: 'Overhead Tricep Extension', muscleGroup: 'arms', category: 'dumbbell', instructions: 'Hold dumbbell overhead with both hands. Lower behind head, extend back up.' },
  { name: 'Skull Crusher', muscleGroup: 'arms', category: 'barbell', instructions: 'Lie on bench, bar over chest. Hinge at elbows, lower bar to forehead, extend.' },
  { name: 'Kickback', muscleGroup: 'arms', category: 'dumbbell', instructions: 'Hinge forward, upper arm parallel to floor. Extend arm straight back, squeeze.' },
  { name: 'Diamond Push-Up', muscleGroup: 'arms', category: 'bodyweight', instructions: 'Hands together in diamond shape under chest. Lower and press.' },

  // ── CORE ───────────────────────────────────────────────────────────────────
  { name: 'Plank', muscleGroup: 'core', category: 'bodyweight', instructions: 'Forearms on floor, body straight line. Hold position, brace core throughout.' },
  { name: 'Crunch', muscleGroup: 'core', category: 'bodyweight', instructions: 'Hands behind head, lift shoulder blades off floor, lower with control.' },
  { name: 'Bicycle Crunch', muscleGroup: 'core', category: 'bodyweight', instructions: 'Alternate bringing opposite elbow to knee while extending other leg.' },
  { name: 'Leg Raise', muscleGroup: 'core', category: 'bodyweight', instructions: 'Lying flat, raise straight legs to 90° then lower slowly without touching floor.' },
  { name: 'Hanging Leg Raise', muscleGroup: 'core', category: 'bodyweight', instructions: 'Hang from bar, raise legs to parallel or vertical, lower with control.' },
  { name: 'Cable Crunch', muscleGroup: 'core', category: 'cable', instructions: 'Kneel at cable, rope behind head. Crunch down, bringing elbows toward floor.' },
  { name: 'Ab Rollout', muscleGroup: 'core', category: 'bodyweight', instructions: 'Kneel with wheel under shoulders. Roll forward to stretch, pull back in with core.' },
  { name: 'Russian Twist', muscleGroup: 'core', category: 'bodyweight', instructions: 'Sit with feet off floor, lean back slightly. Rotate torso side to side.' },
  { name: 'Side Plank', muscleGroup: 'core', category: 'bodyweight', instructions: 'Support on one forearm, body straight, feet stacked. Hold position.' },
  { name: 'Mountain Climber', muscleGroup: 'core', category: 'bodyweight', instructions: 'In push-up position, drive knees to chest alternately in a running motion.' },
  { name: 'Dead Bug', muscleGroup: 'core', category: 'bodyweight', instructions: 'Lie on back, arms and legs up. Lower opposite arm and leg toward floor, return.' },

  // ── CARDIO ─────────────────────────────────────────────────────────────────
  { name: 'Treadmill Run', muscleGroup: 'cardio', category: 'cardio', instructions: 'Set speed and incline. Run for target duration or distance.' },
  { name: 'Stationary Bike', muscleGroup: 'cardio', category: 'cardio', instructions: 'Set resistance level. Pedal for target duration maintaining cadence.' },
  { name: 'Rowing Machine', muscleGroup: 'cardio', category: 'cardio', instructions: 'Drive with legs first, lean back, pull handle to abdomen. Return in reverse.' },
  { name: 'Stair Climber', muscleGroup: 'cardio', category: 'cardio', instructions: 'Set speed. Step continuously, hands lightly on rails for balance.' },
  { name: 'Elliptical', muscleGroup: 'cardio', category: 'cardio', instructions: 'Low-impact full body. Push and pull handles while driving legs in oval motion.' },
  { name: 'Jump Rope', muscleGroup: 'cardio', category: 'cardio', instructions: 'Jump just high enough for rope to pass. Land softly on balls of feet.' },
  { name: 'Battle Ropes', muscleGroup: 'cardio', category: 'cardio', instructions: 'Hold one end each hand. Create waves, alternating or simultaneous.' },
  { name: 'Burpee', muscleGroup: 'cardio', category: 'bodyweight', instructions: 'Squat, jump feet back to push-up, do push-up, jump feet in, jump up with hands overhead.' },

  // ── FULL BODY ──────────────────────────────────────────────────────────────
  { name: 'Power Clean', muscleGroup: 'full_body', category: 'barbell', instructions: 'Start in deadlift position. Explosively pull bar up, catch in front rack position.' },
  { name: 'Hang Clean', muscleGroup: 'full_body', category: 'barbell', instructions: 'Start with bar at hips. Hinge, then explosively extend and pull bar to rack.' },
  { name: 'Thruster', muscleGroup: 'full_body', category: 'barbell', instructions: 'Front squat into overhead press in one fluid movement.' },
  { name: 'Kettlebell Swing', muscleGroup: 'full_body', category: 'dumbbell', instructions: 'Hip hinge, swing kettlebell back between legs. Drive hips forward to swing to chest height.' },
  { name: 'Turkish Get-Up', muscleGroup: 'full_body', category: 'dumbbell', instructions: 'From lying with weight overhead, move through a series of positions to standing, then reverse.' },
  { name: 'Clean and Press', muscleGroup: 'full_body', category: 'barbell', instructions: 'Clean bar to shoulders then press overhead. Return bar to floor between reps.' },
  { name: 'Farmer Carry', muscleGroup: 'full_body', category: 'dumbbell', instructions: 'Hold heavy weights at sides. Walk with upright posture and braced core.' },

  // ── CHEST (specialized) ────────────────────────────────────────
  { name: 'Larsen Press (Barbell)', muscleGroup: 'chest', category: 'barbell', instructions: 'Bench press variation with feet elevated. Lower bar to chest, press up.' },
  { name: 'Svend Press', muscleGroup: 'chest', category: 'dumbbell', instructions: 'Hold plates together at chest. Press straight out, squeeze chest, return.' },
  { name: 'Floor Press (Barbell)', muscleGroup: 'chest', category: 'barbell', instructions: 'Lie on floor, press bar to lockout. Limits range for tricep focus.' },
  { name: 'Floor Press (Dumbbell)', muscleGroup: 'chest', category: 'dumbbell', instructions: 'Lie on floor with dumbbells. Press up, elbows touch floor each rep.' },
  { name: 'Low to High Cable Flye', muscleGroup: 'chest', category: 'cable', instructions: 'Cables at low position. Bring handles up and together targeting upper chest.' },
  { name: 'High to Low Cable Flye', muscleGroup: 'chest', category: 'cable', instructions: 'Cables at high position. Bring handles down and together targeting lower chest.' },
  { name: 'Landmine Press', muscleGroup: 'chest', category: 'barbell', instructions: 'Barbell anchored at one end. Press bar overhead from shoulder.' },

  // ── BACK (specialized) ─────────────────────────────────────────
  { name: 'Landmine Row (Single Arm)', muscleGroup: 'back', category: 'barbell', instructions: 'Barbell anchored at one end. Row bar to hip, elbow close to body.' },
  { name: 'Seal Row', muscleGroup: 'back', category: 'barbell', instructions: 'Lie prone on elevated bench. Row bar to lower chest, no body english.' },
  { name: 'Meadows Row', muscleGroup: 'back', category: 'barbell', instructions: 'Landmine setup. Stand perpendicular, row bar to hip with one arm.' },
  { name: 'Gorilla Row', muscleGroup: 'back', category: 'dumbbell', instructions: 'Hinged position, two dumbbells on floor. Alternate rowing each side.' },
  { name: 'Chest-Supported Row (Dumbbell)', muscleGroup: 'back', category: 'dumbbell', instructions: 'Chest on incline bench. Row dumbbells to hips, eliminate momentum.' },

  // ── LEGS (specialized) ─────────────────────────────────────────
  { name: 'Landmine Squat', muscleGroup: 'legs', category: 'barbell', instructions: 'Barbell anchored at one end, hold at chest. Squat down, drive up.' },
  { name: 'Landmine Romanian Deadlift', muscleGroup: 'legs', category: 'barbell', instructions: 'Barbell anchored at one end. Hinge at hips, feel hamstring stretch.' },
  { name: 'Bulgarian Split Squat (Single Arm)', muscleGroup: 'legs', category: 'dumbbell', instructions: 'Rear foot elevated, hold one dumbbell. Single-side loading for core challenge.' },
  { name: 'Spanish Squat', muscleGroup: 'legs', category: 'bodyweight', instructions: 'Band behind knees, heels elevated. Squat emphasizing quads.' },
  { name: 'Wall Sit', muscleGroup: 'legs', category: 'bodyweight', instructions: 'Back against wall, thighs parallel to floor. Hold position.' },
  { name: 'Nordic Curl', muscleGroup: 'legs', category: 'bodyweight', instructions: 'Kneel, anchor feet. Lower torso forward with control, hamstrings engaged.' },
  { name: 'Reverse Nordic', muscleGroup: 'legs', category: 'bodyweight', instructions: 'Kneel upright. Lean back with control, quads engaged, return.' },
  { name: 'Step-Up (Dumbbell)', muscleGroup: 'legs', category: 'dumbbell', instructions: 'Step onto box or bench, drive through heel, step down with control.' },
  { name: 'Calf Press (Leg Press Machine)', muscleGroup: 'legs', category: 'machine', instructions: 'In leg press, press with balls of feet. Full range calf raises.' },

  // ── SHOULDERS (specialized) ────────────────────────────────────
  { name: 'Egyptian Lateral Raise', muscleGroup: 'shoulders', category: 'dumbbell', instructions: 'Lean to side. Raise dumbbell from hanging position to overhead.' },
  { name: 'Lu Raise', muscleGroup: 'shoulders', category: 'dumbbell', instructions: 'Front raise to overhead, then lower behind head. Full shoulder rotation.' },
  { name: 'Around the World (Shoulders)', muscleGroup: 'shoulders', category: 'dumbbell', instructions: 'Light weight. Circle arms from front to sides to back continuously.' },
  { name: 'Cuban Press', muscleGroup: 'shoulders', category: 'dumbbell', instructions: 'Upright row, rotate to front rack, press overhead. Multi-plane movement.' },
  { name: 'Trap 3 Raise', muscleGroup: 'shoulders', category: 'dumbbell', instructions: 'Lie prone on bench. Raise arms in Y position targeting lower traps.' },

  // ── ARMS (specialized) ─────────────────────────────────────────
  { name: 'Spider Curl', muscleGroup: 'arms', category: 'dumbbell', instructions: 'Chest on vertical side of preacher bench. Curl with arms hanging straight.' },
  { name: 'Zottman Curl', muscleGroup: 'arms', category: 'dumbbell', instructions: 'Curl with supinated grip. Rotate to pronated at top, lower slowly.' },
  { name: 'Overhead Cable Curl', muscleGroup: 'arms', category: 'cable', instructions: 'Cables at shoulder height. Curl handles toward head, bicep peak contraction.' },
  { name: 'Cable Overhead Tricep Extension', muscleGroup: 'arms', category: 'cable', instructions: 'Cable high behind head. Extend arms overhead, control return.' },
  { name: 'JM Press', muscleGroup: 'arms', category: 'barbell', instructions: 'Hybrid between close-grip press and skull crusher. Powerful tricep builder.' },

  // ── CORE (specialized) ─────────────────────────────────────────
  { name: 'Curl Up', muscleGroup: 'core', category: 'bodyweight', instructions: 'Lie on back, hands under lower back. Lift head and shoulders off ground, hold. Stability-focused core exercise.' },
  { name: 'Reverse Crunch', muscleGroup: 'core', category: 'bodyweight', instructions: 'Lie on back, knees bent. Curl hips and lower back off floor, bring knees to chest.' },
  { name: 'Hanging Knee Raise', muscleGroup: 'core', category: 'bodyweight', instructions: 'Hang from bar, bring knees to chest. Control down. Easier than leg raise.' },
  { name: 'Ab Wheel Rollout', muscleGroup: 'core', category: 'bodyweight', instructions: 'Kneel with ab wheel. Roll forward keeping core tight, return. Advanced core stability.' },
  { name: 'Bird Dog', muscleGroup: 'core', category: 'bodyweight', instructions: 'On hands and knees. Extend opposite arm and leg, hold, switch. Core stability pattern.' },
  { name: 'Shoulder Taps', muscleGroup: 'core', category: 'bodyweight', instructions: 'High plank position. Tap opposite shoulder with hand, minimize hip rotation. Anti-rotation core.' },
  { name: 'Landmine Twist', muscleGroup: 'core', category: 'barbell', instructions: 'Barbell anchored at one end. Rotate bar side to side from chest.' },
  { name: 'Pallof Press', muscleGroup: 'core', category: 'cable', instructions: 'Cable at chest height. Press out resisting rotation, hold, return.' },
  { name: 'Cable Woodchop (High to Low)', muscleGroup: 'core', category: 'cable', instructions: 'Cable high, pull down and across body in chopping motion.' },
  { name: 'Cable Woodchop (Low to High)', muscleGroup: 'core', category: 'cable', instructions: 'Cable low, pull up and across body in lifting motion.' },
  { name: 'Stir the Pot', muscleGroup: 'core', category: 'bodyweight', instructions: 'Plank on stability ball. Move arms in circular motion.' },
  { name: 'Body Saw', muscleGroup: 'core', category: 'bodyweight', instructions: 'Forearm plank. Rock body forward and back maintaining plank.' },

  // ── CARDIO (specialized) ───────────────────────────────────────
  { name: 'Battle Ropes', muscleGroup: 'cardio', category: 'cardio', instructions: 'Hold one end each hand. Create waves, alternating or simultaneous.' },
  { name: 'Sled Push', muscleGroup: 'cardio', category: 'cardio', instructions: 'Push weighted sled, lean forward, drive through legs.' },
  { name: 'Sled Pull', muscleGroup: 'cardio', category: 'cardio', instructions: 'Attach rope to sled. Walk backward pulling sled toward you.' },
  { name: 'Box Jump', muscleGroup: 'cardio', category: 'bodyweight', instructions: 'Jump onto box, land softly. Step down with control.' },

  // ── MOBILITY & STRETCHING ──────────────────────────────────────
  { name: 'Cat Cow', muscleGroup: 'mobility', category: 'bodyweight', instructions: 'On hands and knees. Arch back (cow), then round spine (cat). Flow between positions.' },
  { name: 'Torso Mobility Flow', muscleGroup: 'mobility', category: 'bodyweight', instructions: 'Lying on floor. Rotate torso, open hips, move through full range of motion.' },
  { name: 'World\'s Greatest Stretch', muscleGroup: 'mobility', category: 'bodyweight', instructions: 'Lunge position. Rotate torso, reach overhead, open hip flexor. Multi-plane stretch.' },
  { name: 'Shoulder External Rotation', muscleGroup: 'mobility', category: 'bodyweight', instructions: 'Arm at 90 degrees. Rotate externally, feel stretch in front of shoulder.' },
  { name: 'Upper Back Mobility (Broomstick)', muscleGroup: 'mobility', category: 'bodyweight', instructions: 'Hold stick overhead. Pass behind head and back, improving thoracic mobility.' },
  { name: 'Hip Mobility Complex', muscleGroup: 'mobility', category: 'bodyweight', instructions: 'Series of hip movements: rotations, circles, flexion, extension. Full hip range.' },
  { name: 'Fire Hydrant', muscleGroup: 'mobility', category: 'bodyweight', instructions: 'On hands and knees. Lift leg out to side, knee bent. Hip abduction movement.' },
  { name: 'Ankle Dorsiflexion', muscleGroup: 'mobility', category: 'bodyweight', instructions: 'Knee to wall. Push knee forward over toes, stretching ankle and calf.' },
  { name: '90/90 Hip Stretch', muscleGroup: 'mobility', category: 'bodyweight', instructions: 'Sit with both legs at 90 degrees. Switch sides, opening hip internal/external rotation.' },
  { name: 'Shoulder Dislocates', muscleGroup: 'mobility', category: 'bodyweight', instructions: 'Hold band or stick wide. Pass overhead behind back and return. Shoulder mobility.' },
];

export const MUSCLE_GROUPS = [
  { id: 'chest',     label: 'Chest',      emoji: '💪' },
  { id: 'back',      label: 'Back',       emoji: '🔙' },
  { id: 'legs',      label: 'Legs',       emoji: '🦵' },
  { id: 'shoulders', label: 'Shoulders',  emoji: '🏋️' },
  { id: 'arms',      label: 'Arms',       emoji: '💪' },
  { id: 'core',      label: 'Core',       emoji: '🎯' },
  { id: 'cardio',    label: 'Cardio',     emoji: '❤️' },
  { id: 'mobility',  label: 'Mobility',   emoji: '🧘' },
  { id: 'full_body', label: 'Full Body',  emoji: '⚡' },
];

export const CATEGORIES = [
  { id: 'barbell',    label: 'Barbell' },
  { id: 'dumbbell',   label: 'Dumbbell' },
  { id: 'machine',    label: 'Machine' },
  { id: 'cable',      label: 'Cable' },
  { id: 'bodyweight', label: 'Bodyweight' },
  { id: 'cardio',     label: 'Cardio' },
];
