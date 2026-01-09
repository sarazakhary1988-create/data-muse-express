# MANUS 1.6 MAX - Quick Start Examples

## 1. Lead Enrichment with Export

```typescript
import { enrichPerson } from '@/lib/manus-core/leadEnrichmentService';

async function enrichAndExport() {
  // Enrich a lead
  const result = await enrichPerson({
    firstName: 'John',
    lastName: 'Doe',
    company: 'Acme Corporation',
    location: 'New York, NY'
  });

  // Access enriched profile data
  console.log(result.profile.fullName);        // "John Doe"
  console.log(result.profile.email);           // Generated email
  console.log(result.profile.experience);      // Experience array
  console.log(result.profile.metadata);        // Confidence scores

  // Export to any format
  await result.download('pdf', 'john_doe.pdf');
  await result.download('docx', 'john_doe.docx');
  await result.download('xlsx', 'john_doe.xlsx');
  await result.download('pptx', 'john_doe.pptx');
  await result.download('json', 'john_doe.json');
  await result.download('md', 'john_doe.md');
  await result.download('csv', 'john_doe.csv');
}
```

## 2. AI Chat About Profile

```typescript
import { enrichPerson } from '@/lib/manus-core/leadEnrichmentService';

async function chatWithProfile() {
  const result = await enrichPerson({
    firstName: 'Jane',
    lastName: 'Smith',
    company: 'Tech Startup Inc'
  });

  // Ask questions about the profile
  const response1 = await result.chatbot.ask(
    'What companies has this person worked for?'
  );
  console.log(response1.answer);
  console.log(response1.sources); // Shows which documents were used

  const response2 = await result.chatbot.ask(
    'What are their key skills?'
  );
  console.log(response2.answer);

  // Get conversation history
  const history = result.chatbot.getHistory();
  console.log(history);

  // Summarize conversation
  const summary = await result.chatbot.summarize();
  console.log(summary);
}
```

## 3. Email Discovery

```typescript
import { 
  generateRankedEmails, 
  findMostLikelyEmail,
  guessDomainFromCompany,
  verifyEmail 
} from '@/lib/manus-core/utils/emailPatterns';

async function discoverEmails() {
  // Generate all possible email patterns
  const emails = generateRankedEmails('John', 'Doe', 'company.com');
  console.log(emails);
  // [
  //   { email: 'john.doe@company.com', score: 0.9 },
  //   { email: 'jdoe@company.com', score: 0.6 },
  //   { email: 'john@company.com', score: 0.7 },
  //   ...
  // ]

  // Find most likely email
  const result = await findMostLikelyEmail('John', 'Doe', 'company.com');
  console.log(result);
  // {
  //   email: 'john.doe@company.com',
  //   valid: true,
  //   score: 90,
  //   status: 'valid',
  //   sources: ['pattern-analysis', 'format-validation']
  // }

  // Guess domain from company name
  const domains = guessDomainFromCompany('Acme Corporation');
  console.log(domains);
  // ['acmecorporation.com', 'acmecorporation.net', 'acmecorporation.io', ...]

  // Verify an email
  const verification = await verifyEmail('john.doe@company.com');
  console.log(verification.valid);  // true/false
  console.log(verification.score);  // 0-100
}
```

## 4. Vector Store & RAG

```typescript
import { VectorStore } from '@/lib/rag/vectorStore';
import { RAGChatbot } from '@/lib/rag/aiChat';

async function useVectorStore() {
  // Initialize vector store
  const vectorStore = new VectorStore();
  await vectorStore.initialize();

  // Add documents to knowledge base
  await vectorStore.addDocument(
    'profile-basic',
    'John Doe is a Senior Software Engineer at Google with 10 years of experience.',
    { type: 'profile', category: 'overview' }
  );

  await vectorStore.addDocument(
    'profile-skills',
    'Skills include Python, JavaScript, TypeScript, React, Node.js, and AWS.',
    { type: 'profile', category: 'skills' }
  );

  await vectorStore.addDocument(
    'profile-education',
    'Graduated from MIT with a degree in Computer Science in 2012.',
    { type: 'profile', category: 'education' }
  );

  // Search for similar documents
  const results = await vectorStore.similaritySearch('programming languages', 3);
  
  results.forEach(result => {
    console.log(`Score: ${result.score.toFixed(3)}`);
    console.log(`Text: ${result.document.text}`);
    console.log(`Metadata:`, result.document.metadata);
  });

  // Create chatbot with knowledge base
  const chatbot = new RAGChatbot(
    vectorStore,
    'You are a helpful assistant with information about John Doe.'
  );

  const response = await chatbot.ask('What programming languages does John know?');
  console.log(response.answer);
  console.log('Sources:', response.sources);
}
```

## 5. Batch Enrichment

```typescript
import { enrichBatch } from '@/lib/manus-core/leadEnrichmentService';

async function batchEnrich() {
  const leads = [
    { firstName: 'John', lastName: 'Doe', company: 'Acme Corp' },
    { firstName: 'Jane', lastName: 'Smith', company: 'Tech Startup' },
    { firstName: 'Bob', lastName: 'Johnson', company: 'Finance Inc' },
  ];

  // Enrich all leads
  const results = await enrichBatch(leads);

  // Process results
  for (const result of results) {
    console.log(`Enriched: ${result.profile.fullName}`);
    console.log(`Email: ${result.profile.email}`);
    
    // Export each profile
    await result.download('pdf');
  }

  console.log(`Successfully enriched ${results.length}/${leads.length} leads`);
}
```

## 6. Export System Standalone

```typescript
import { exportProfile, type EnrichedProfile } from '@/lib/exports';

async function exportProfileData() {
  // Create a profile object
  const profile: EnrichedProfile = {
    fullName: 'John Doe',
    title: 'Senior Software Engineer',
    company: 'Google',
    location: 'Mountain View, CA',
    email: 'john.doe@google.com',
    linkedin: 'https://linkedin.com/in/johndoe',
    experience: [
      {
        company: 'Google',
        title: 'Senior Software Engineer',
        duration: '2018 - Present',
        current: true
      },
      {
        company: 'Facebook',
        title: 'Software Engineer',
        duration: '2015 - 2018',
        current: false
      }
    ],
    education: [
      {
        school: 'MIT',
        degree: 'BS Computer Science',
        field: 'Computer Science',
        year: '2015'
      }
    ],
    skills: ['Python', 'JavaScript', 'React', 'Node.js', 'AWS'],
    metadata: {
      confidence: 0.95,
      freshness: new Date().toISOString(),
      sources: ['LinkedIn', 'Company Website']
    }
  };

  // Export to different formats
  const pdfBlob = await exportProfile(profile, 'pdf');
  const docxBlob = await exportProfile(profile, 'docx');
  const xlsxBlob = await exportProfile(profile, 'xlsx');
  const pptxBlob = await exportProfile(profile, 'pptx');
  const jsonBlob = await exportProfile(profile, 'json');

  // Download a file
  const url = URL.createObjectURL(pdfBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'john_doe.pdf';
  a.click();
  URL.revokeObjectURL(url);
}
```

## 7. Advanced Email Verification

```typescript
import { 
  verifyEmailsBatch,
  extractEmailsFromText,
  isFreeEmailProvider,
  normalizeEmail 
} from '@/lib/manus-core/utils/emailPatterns';

async function advancedEmailOps() {
  // Batch verification
  const emails = [
    'john.doe@company.com',
    'jane.smith@startup.io',
    'invalid-email',
    'bob@gmail.com'
  ];

  const results = await verifyEmailsBatch(emails);
  results.forEach(result => {
    console.log(`${result.email}: ${result.status} (score: ${result.score})`);
  });

  // Extract emails from text
  const text = `
    Contact us at info@company.com or support@company.com.
    For sales, email sales@company.com.
  `;
  const extracted = extractEmailsFromText(text);
  console.log('Extracted:', extracted);

  // Check if email is from free provider
  console.log(isFreeEmailProvider('john@gmail.com'));      // true
  console.log(isFreeEmailProvider('john@company.com'));    // false

  // Normalize emails
  console.log(normalizeEmail('  John.Doe@Company.COM  ')); // "john.doe@company.com"
}
```

## 8. Complete End-to-End Example

```typescript
import { enrichPerson } from '@/lib/manus-core/leadEnrichmentService';
import { VectorStore } from '@/lib/rag';

async function completeWorkflow() {
  console.log('🚀 Starting lead enrichment workflow...\n');

  // Step 1: Enrich a lead
  console.log('📊 Enriching lead data...');
  const result = await enrichPerson({
    firstName: 'Sarah',
    lastName: 'Johnson',
    company: 'Amazon Web Services',
    location: 'Seattle, WA'
  });

  // Step 2: Review enriched data
  console.log('\n✅ Enrichment complete!');
  console.log(`Name: ${result.profile.fullName}`);
  console.log(`Title: ${result.profile.title}`);
  console.log(`Email: ${result.profile.email}`);
  console.log(`Confidence: ${(result.profile.metadata?.confidence || 0) * 100}%`);

  // Step 3: Export to multiple formats
  console.log('\n📄 Exporting to documents...');
  await result.download('pdf', 'sarah_johnson.pdf');
  await result.download('docx', 'sarah_johnson.docx');
  await result.download('xlsx', 'sarah_johnson.xlsx');
  console.log('✅ Documents exported');

  // Step 4: Ask questions via AI chat
  console.log('\n💬 Querying AI chatbot...');
  
  const q1 = await result.chatbot.ask('What is this person\'s current role?');
  console.log(`Q: What is this person's current role?`);
  console.log(`A: ${q1.answer}\n`);

  const q2 = await result.chatbot.ask('What skills does this person have?');
  console.log(`Q: What skills does this person have?`);
  console.log(`A: ${q2.answer}\n`);

  // Step 5: Get conversation summary
  const summary = await result.chatbot.summarize();
  console.log('📝 Conversation Summary:');
  console.log(summary);

  console.log('\n✨ Workflow complete!');
}

// Run the workflow
completeWorkflow().catch(console.error);
```

## Error Handling

```typescript
import { enrichPerson } from '@/lib/manus-core/leadEnrichmentService';

async function enrichWithErrorHandling() {
  try {
    const result = await enrichPerson({
      firstName: 'John',
      lastName: 'Doe',
      company: 'Acme Corp'
    });

    // Check confidence score
    if (result.profile.metadata?.confidence && result.profile.metadata.confidence < 0.5) {
      console.warn('Low confidence enrichment - verify data manually');
    }

    await result.download('pdf');
    
  } catch (error) {
    console.error('Enrichment failed:', error);
    // Handle error appropriately
  }
}
```

## Performance Tips

1. **Use Batch Operations**
   ```typescript
   // Good - parallel processing
   await vectorStore.addDocuments([doc1, doc2, doc3]);
   
   // Avoid - sequential
   await vectorStore.addDocument('id1', text1);
   await vectorStore.addDocument('id2', text2);
   await vectorStore.addDocument('id3', text3);
   ```

2. **Configure Token Limits**
   ```typescript
   const response = await chatbot.ask('question', {
     maxTokens: 500  // Shorter responses, faster
   });
   ```

3. **Limit Search Results**
   ```typescript
   const results = await vectorStore.similaritySearch('query', 3); // Only top 3
   ```

## Notes

- All functions are async - always use `await`
- Vector store must be initialized before use
- Email patterns are generated, not verified against actual servers
- Export functions return Blobs - use download helper for browser downloads
- RAG chatbot requires initialized vector store
- See IMPLEMENTATION_SUMMARY.md for detailed documentation
