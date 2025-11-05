const { queueManager } = require('./packages/database/dist/bullmq/queue-manager');

async function test() {
  const queue = queueManager.getQueue('discovery:aws');
  
  console.log('Queue name:', queue.name);
  
  const waiting = await queue.getWaiting(0, 10);
  const active = await queue.getActive(0, 10);
  const completed = await queue.getCompleted(0, 10);
  const failed = await queue.getFailed(0, 10);
  
  console.log('Waiting:', waiting.length);
  console.log('Active:', active.length);
  console.log('Completed:', completed.length);
  console.log('Failed:', failed.length);
  
  if (completed.length > 0) {
    console.log('\nFirst completed job:');
    console.log('ID:', completed[0].id);
    console.log('returnvalue:', completed[0].returnvalue);
  }
  
  process.exit(0);
}

test();
