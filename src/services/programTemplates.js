import { collection, doc, query, where, getDocs, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db as firestore } from './firebase';
import * as db from './database';

// Create a template from a program
export async function createTemplate(trainerId, programData) {
  const templateId = `tpl_${trainerId}_${Date.now()}`;
  const templateRef = doc(firestore, 'program_templates', templateId);

  // If programId is provided, fetch full program structure
  let fullProgramData = programData;
  if (programData.programId && !programData.days) {
    const program = await db.getProgramById(programData.programId);
    if (program) {
      fullProgramData = {
        ...programData,
        days: program.days,
      };
    }
  }

  await setDoc(templateRef, {
    trainerId,
    programId: programData.programId, // Store the local DB program ID
    name: fullProgramData.name,
    description: fullProgramData.description || '',
    daysPerWeek: fullProgramData.days_per_week || fullProgramData.daysPerWeek || 3,
    programData: fullProgramData, // Full program structure (days, exercises)
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return templateId;
}

// Get all templates for a trainer
export async function getMyTemplates(trainerId) {
  const q = query(
    collection(firestore, 'program_templates'),
    where('trainerId', '==', trainerId)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ templateId: doc.id, ...doc.data() }));
}

// Get a single template
export async function getTemplate(templateId) {
  const templateRef = doc(firestore, 'program_templates', templateId);
  const templateDoc = await getDoc(templateRef);

  if (!templateDoc.exists()) {
    throw new Error('Template not found');
  }

  return { templateId: templateDoc.id, ...templateDoc.data() };
}

// Update a template
export async function updateTemplate(templateId, updates) {
  const templateRef = doc(firestore, 'program_templates', templateId);

  await updateDoc(templateRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

// Delete a template
export async function deleteTemplate(templateId) {
  const templateRef = doc(firestore, 'program_templates', templateId);
  await deleteDoc(templateRef);
}

// Assign template to client(s)
export async function assignToClient(templateId, clientId, trainerId, assignmentType = 'linked', customizations = null) {
  const assignmentId = `assign_${trainerId}_${clientId}_${Date.now()}`;
  const assignmentRef = doc(firestore, 'program_assignments', assignmentId);

  // Get template data
  const template = await getTemplate(templateId);

  await setDoc(assignmentRef, {
    trainerId,
    clientId,
    templateId,
    assignmentType, // 'linked' or 'custom'
    customizations: customizations || null,
    programData: template.programData,
    assignedAt: serverTimestamp(),
    localProgramId: null, // Will be set when client syncs
  });

  return assignmentId;
}

// Get all assignments for a client
export async function getClientAssignments(clientId) {
  const q = query(
    collection(firestore, 'program_assignments'),
    where('clientId', '==', clientId)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ assignmentId: doc.id, ...doc.data() }));
}

// Get assignments for a specific client (trainer's view)
export async function getClientAssignmentsByTrainer(trainerId, clientId) {
  const q = query(
    collection(firestore, 'program_assignments'),
    where('trainerId', '==', trainerId),
    where('clientId', '==', clientId)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ assignmentId: doc.id, ...doc.data() }));
}

// Get assignments for a specific template
export async function getTemplateAssignments(templateId) {
  const q = query(
    collection(firestore, 'program_assignments'),
    where('templateId', '==', templateId)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ assignmentId: doc.id, ...doc.data() }));
}

// Remove/unassign a program from a client
export async function removeAssignment(assignmentId) {
  const assignmentRef = doc(firestore, 'program_assignments', assignmentId);
  await deleteDoc(assignmentRef);
}

// Sync assigned programs to client's local database
export async function syncAssignedPrograms(clientId, currentUserId) {
  const assignments = await getClientAssignments(clientId);

  const syncedPrograms = [];

  for (const assignment of assignments) {
    // Check if program already exists locally
    const existingPrograms = await db.getPrograms();
    const existingProgram = existingPrograms.find(
      p => p.linked_template_id === assignment.templateId
    );

    if (existingProgram) {
      // Update existing program if it's a linked template
      if (assignment.assignmentType === 'linked') {
        const { programData } = assignment;
        await db.updateProgram(existingProgram.id, {
          name: programData.name,
          description: programData.description,
          days_per_week: programData.days_per_week || programData.daysPerWeek,
        });

        // TODO: Update days and exercises (complex sync logic)
        // For now, just update metadata
      }

      syncedPrograms.push(existingProgram);
    } else {
      // Create new program from assignment
      const { programData } = assignment;
      const programId = await db.createProgram({
        name: programData.name,
        description: programData.description,
        daysPerWeek: programData.days_per_week || programData.daysPerWeek || 3,
        isActive: false,
        createdByUserId: assignment.trainerId,
        isTemplate: false,
        linkedTemplateId: assignment.assignmentType === 'linked' ? assignment.templateId : null,
      });

      // Add days and exercises
      if (programData.days && programData.days.length > 0) {
        for (const day of programData.days) {
          const dayId = await db.addProgramDay(programId, day.day_number || day.dayNumber, day.name);

          if (day.exercises && day.exercises.length > 0) {
            for (const exercise of day.exercises) {
              await db.addExerciseToDay(dayId, {
                exerciseId: exercise.exercise_id || exercise.exerciseId,
                sets: exercise.sets || 3,
                reps: exercise.reps || '8-12',
                restSeconds: exercise.rest_seconds || exercise.restSeconds || 90,
                notes: exercise.notes || '',
                sortOrder: exercise.sort_order || exercise.sortOrder || 0,
              });
            }
          }
        }
      }

      syncedPrograms.push({ id: programId });

      // Update assignment with local program ID
      const assignmentRef = doc(firestore, 'program_assignments', assignment.assignmentId);
      await updateDoc(assignmentRef, {
        localProgramId: programId,
      });
    }
  }

  return syncedPrograms;
}

// Check if a program is assigned (read-only for client)
export async function isProgramAssigned(programId) {
  const program = await db.getProgramById(programId);
  return program && program.linked_template_id !== null;
}
