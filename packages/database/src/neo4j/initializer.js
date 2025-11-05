"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeNeo4jSchema = initializeNeo4jSchema;
const tslib_1 = require("tslib");
const common_1 = require("@cmdb/common");
const fs = tslib_1.__importStar(require("fs"));
const path = tslib_1.__importStar(require("path"));
async function initializeNeo4jSchema(client, schemaFilePath) {
    const session = client.getSession();
    try {
        const defaultSchemaPath = path.resolve(__dirname, 'schema.cypher');
        const filePath = schemaFilePath || defaultSchemaPath;
        if (!fs.existsSync(filePath)) {
            throw new Error(`Schema file not found at: ${filePath}`);
        }
        const cypherScript = fs.readFileSync(filePath, 'utf-8');
        const statements = parseSchemaStatements(cypherScript);
        common_1.logger.info(`Initializing Neo4j schema from: ${filePath}`);
        common_1.logger.info(`Found ${statements.length} statements to execute`);
        let successCount = 0;
        let skipCount = 0;
        for (const statement of statements) {
            try {
                await session.run(statement);
                successCount++;
                logStatementExecution(statement);
            }
            catch (error) {
                if (isIdempotentError(error)) {
                    skipCount++;
                    common_1.logger.debug(`Skipped existing: ${extractConstraintOrIndexName(statement)}`);
                }
                else {
                    common_1.logger.error(`Failed to execute statement: ${statement.substring(0, 100)}...`);
                    throw error;
                }
            }
        }
        common_1.logger.info(`Schema initialization complete: ${successCount} created, ${skipCount} skipped (already exist)`);
        await verifySchema(session);
    }
    catch (error) {
        common_1.logger.error('Failed to initialize Neo4j schema', error);
        throw error;
    }
    finally {
        await session.close();
    }
}
function parseSchemaStatements(cypherScript) {
    const rawStatements = cypherScript.split(';');
    const statements = rawStatements
        .map((stmt) => {
        const lines = stmt
            .split('\n')
            .filter((line) => {
            const trimmed = line.trim();
            return trimmed && !trimmed.startsWith('//');
        })
            .join('\n');
        return lines.trim();
    })
        .filter((stmt) => {
        return stmt.length > 0;
    });
    return statements;
}
function isIdempotentError(error) {
    const message = error.message || '';
    return (message.includes('already exists') ||
        message.includes('AlreadyExists') ||
        message.includes('EquivalentSchemaRuleAlreadyExists'));
}
function logStatementExecution(statement) {
    if (statement.includes('CREATE CONSTRAINT')) {
        const name = extractConstraintOrIndexName(statement);
        common_1.logger.info(`Created constraint: ${name}`);
    }
    else if (statement.includes('CREATE INDEX') && !statement.includes('FULLTEXT')) {
        const name = extractConstraintOrIndexName(statement);
        common_1.logger.info(`Created index: ${name}`);
    }
    else if (statement.includes('CREATE FULLTEXT INDEX')) {
        const name = extractConstraintOrIndexName(statement);
        common_1.logger.info(`Created full-text index: ${name}`);
    }
}
function extractConstraintOrIndexName(statement) {
    const match = statement.match(/CREATE\s+(?:CONSTRAINT|INDEX|FULLTEXT\s+INDEX)\s+(\w+)/i);
    if (match && match[1]) {
        return match[1];
    }
    return statement.substring(0, 50).replace(/\s+/g, ' ');
}
async function verifySchema(session) {
    try {
        const constraintsResult = await session.run('SHOW CONSTRAINTS');
        const indexesResult = await session.run('SHOW INDEXES');
        const constraintCount = constraintsResult.records.length || 0;
        const indexCount = indexesResult.records.length || 0;
        common_1.logger.info(`Schema verification complete:`);
        common_1.logger.info(`  - Constraints: ${constraintCount}`);
        common_1.logger.info(`  - Indexes: ${indexCount}`);
    }
    catch (error) {
        common_1.logger.warn('Could not verify schema (SHOW commands may not be available)');
    }
}
//# sourceMappingURL=initializer.js.map