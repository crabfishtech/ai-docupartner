// Script to update conversations.json to include document group IDs
const fs = require('fs');
const path = require('path');

// Paths to the files
const conversationsPath = path.join(process.cwd(), 'files', 'conversations.json');
const documentGroupsPath = path.join(process.cwd(), 'files', 'document-groups.json');

// Check if files exist
if (!fs.existsSync(conversationsPath)) {
  console.error('Conversations file not found');
  process.exit(1);
}

if (!fs.existsSync(documentGroupsPath)) {
  console.error('Document groups file not found');
  process.exit(1);
}

// Read the files
const conversations = JSON.parse(fs.readFileSync(conversationsPath, 'utf8'));
const documentGroups = JSON.parse(fs.readFileSync(documentGroupsPath, 'utf8'));

// Get the first document group ID as a default
const defaultGroupId = documentGroups.groups.length > 0 ? documentGroups.groups[0].guid : null;

if (!defaultGroupId) {
  console.error('No document groups found');
  process.exit(1);
}

// Update each conversation to include the groupId if it doesn't already have one
let updated = false;
conversations.forEach(conversation => {
  if (!conversation.groupId) {
    conversation.groupId = defaultGroupId;
    updated = true;
  }
});

if (updated) {
  // Write the updated conversations back to the file
  fs.writeFileSync(conversationsPath, JSON.stringify(conversations, null, 2));
  console.log('Successfully updated conversations with document group IDs');
} else {
  console.log('No updates needed - all conversations already have group IDs');
}
