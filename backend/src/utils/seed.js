require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('../models/User');
const Exam = require('../models/Exam');

async function seed() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/aiexaminer');
  console.log('✅ Connected to MongoDB');

  // Clear existing
  await User.deleteMany({});
  await Exam.deleteMany({});

  // Create Admin
  await User.create({ name: 'System Admin', email: 'admin@aiexaminer.com', password: 'admin123', role: 'admin', isApproved: true, isActive: true });

  // Create Teachers
  const teacher1 = await User.create({ name: 'Dr. Priya Sharma', email: 'teacher@aiexaminer.com', password: 'teacher123', role: 'teacher', isApproved: true, isActive: true, employeeId: 'EMP001', department: 'Computer Science', subjects: ['Data Structures', 'Algorithms'] });
  const teacher2 = await User.create({ name: 'Prof. Rahul Mehta', email: 'teacher2@aiexaminer.com', password: 'teacher123', role: 'teacher', isApproved: true, isActive: true, employeeId: 'EMP002', department: 'Electronics', subjects: ['Digital Systems', 'VLSI'] });

  // Create Students
  await User.create({ name: 'Arjun Patel', email: 'student@aiexaminer.com', password: 'student123', role: 'student', isApproved: true, isActive: true, rollNumber: '21CS001', usn: 'MSRIT21CS001', semester: '6th', section: 'A', department: 'Computer Science', collegeName: 'MSRIT Bangalore' });
  await User.create({ name: 'Sneha Reddy', email: 'student2@aiexaminer.com', password: 'student123', role: 'student', isApproved: true, isActive: true, rollNumber: '21CS002', usn: 'MSRIT21CS002', semester: '6th', section: 'A', department: 'Computer Science', collegeName: 'MSRIT Bangalore' });
  await User.create({ name: 'Kiran Kumar', email: 'student3@aiexaminer.com', password: 'student123', role: 'student', isApproved: true, isActive: true, rollNumber: '21CS003', usn: 'MSRIT21CS003', semester: '6th', section: 'B', department: 'Computer Science', collegeName: 'MSRIT Bangalore' });

  // Create Sample Exams
  await Exam.create({
    title: 'Data Structures Mid-Term 2024',
    description: 'Mid-term examination covering arrays, linked lists, stacks, and queues.',
    instructions: 'Attempt all questions. Each question carries equal marks. Write clearly.',
    subjectName: 'Data Structures',
    department: 'Computer Science',
    semester: '6th',
    examDate: new Date('2024-06-15'),
    totalMarks: 50,
    passingMarks: 20,
    duration: 180,
    difficultyLevel: 'medium',
    createdBy: teacher1._id,
    status: 'published',
    publishedAt: new Date(),
    questions: [
      { questionNumber: '1', text: 'Explain the difference between stack and queue with examples.', referenceAnswer: 'A stack follows LIFO (Last In First Out) principle where elements are inserted and deleted from the same end called top. Example: function call stack, undo operations. A queue follows FIFO (First In First Out) principle where elements are inserted from rear and deleted from front. Example: CPU scheduling, printer queues. Both are linear data structures but differ in access patterns.', maxMarks: 10, keywords: ['LIFO', 'FIFO', 'stack', 'queue', 'top', 'rear', 'front'], expectedConcepts: ['insertion deletion order', 'real world examples', 'time complexity'], difficultyLevel: 'easy' },
      { questionNumber: '2', text: 'Write an algorithm for binary search and analyze its time complexity.', referenceAnswer: 'Binary search works on sorted arrays by repeatedly dividing the search space in half. Algorithm: 1. Set low=0, high=n-1. 2. While low<=high, find mid=(low+high)/2. 3. If arr[mid]==target return mid. 4. If arr[mid]<target set low=mid+1 else set high=mid-1. 5. Return -1 if not found. Time Complexity: Best O(1), Average O(log n), Worst O(log n). Space Complexity: O(1) iterative, O(log n) recursive.', maxMarks: 15, keywords: ['binary search', 'sorted', 'O(log n)', 'mid', 'low', 'high', 'divide'], expectedConcepts: ['divide and conquer', 'time complexity analysis', 'space complexity'], difficultyLevel: 'medium' },
      { questionNumber: '3', text: 'Describe linked list operations with time complexity.', referenceAnswer: 'Linked list operations: 1. Insertion at head: O(1) - create node, point next to head, update head. 2. Insertion at tail: O(n) - traverse to last node, append. 3. Insertion at position: O(n) - traverse to position-1, rearrange links. 4. Deletion at head: O(1) - update head to next. 5. Deletion by value: O(n) - traverse to find node, update previous next. 6. Search: O(n) - traverse comparing values. Unlike arrays, no random access; memory not contiguous.', maxMarks: 15, keywords: ['linked list', 'insertion', 'deletion', 'O(1)', 'O(n)', 'head', 'node', 'pointer'], expectedConcepts: ['time complexity', 'pointer manipulation', 'dynamic memory'], difficultyLevel: 'medium' },
      { questionNumber: '4', text: 'What is a hash table? Explain collision resolution techniques.', referenceAnswer: 'A hash table is a data structure that maps keys to values using a hash function. Hash function converts key to array index. Collision occurs when two keys map to same index. Collision resolution: 1. Chaining: Each slot holds linked list of elements with same hash. O(1) average, O(n) worst. 2. Open Addressing: a) Linear Probing: check next slot sequentially. b) Quadratic Probing: check i^2 slots away. c) Double Hashing: use second hash function. Load factor = n/m should be < 0.7 for efficiency.', maxMarks: 10, keywords: ['hash table', 'hash function', 'collision', 'chaining', 'open addressing', 'load factor'], expectedConcepts: ['collision resolution', 'chaining vs open addressing', 'load factor'], difficultyLevel: 'hard' },
    ],
    totalSubmissions: 0,
    scoringWeights: { semantic: 0.4, keyword: 0.25, concept: 0.25, completeness: 0.1 }
  });

  await Exam.create({
    title: 'Algorithms Analysis Final Exam',
    description: 'Final examination covering sorting, graph algorithms, and dynamic programming.',
    instructions: 'All questions are compulsory. Show all steps for full marks.',
    subjectName: 'Algorithms',
    department: 'Computer Science',
    semester: '6th',
    totalMarks: 100,
    passingMarks: 40,
    duration: 180,
    difficultyLevel: 'hard',
    createdBy: teacher1._id,
    status: 'draft',
    questions: [
      { questionNumber: '1', text: 'Explain QuickSort algorithm with worst-case and average-case complexity.', referenceAnswer: 'QuickSort selects a pivot element and partitions the array around it. Smaller elements go left, larger go right. Average case O(n log n) when pivot divides array roughly equally. Worst case O(n²) when pivot is always smallest/largest (sorted array with first element pivot). Best case O(n log n). Space O(log n) average for recursion stack. Improvements: random pivot selection, three-way partition for duplicates, introsort uses heapsort when recursion depth exceeds threshold.', maxMarks: 20, keywords: ['pivot', 'partition', 'O(n log n)', 'O(n²)', 'recursion', 'divide and conquer'], expectedConcepts: ['worst case analysis', 'average case analysis', 'partitioning'], difficultyLevel: 'medium' },
    ],
    scoringWeights: { semantic: 0.4, keyword: 0.25, concept: 0.25, completeness: 0.1 }
  });

  console.log('✅ Seed data created successfully!');
  console.log('\n📋 Demo Credentials:');
  console.log('  Admin:   admin@aiexaminer.com    / admin123');
  console.log('  Teacher: teacher@aiexaminer.com  / teacher123');
  console.log('  Student: student@aiexaminer.com  / student123');
  await mongoose.disconnect();
}

seed().catch((err) => { console.error('❌ Seed failed:', err); process.exit(1); });
