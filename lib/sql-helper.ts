import { JsonValue } from 'type-fest';

export interface SqlQueryResult {
    query: string;
    parameters: Record<string, unknown>;
}

export class SqlQueryProcessor {
    private static readonly parameterPattern = /(\w+)\.@(\w+)\b|@(\w+)\b(?!\.)/g;

    /**
     * Processes SQL query and parameters, handling IN clauses and parameter replacements
     * @param query The SQL query string
     * @param parameters Optional parameters dictionary
     * @returns Processed query and parameters
     */
    static processQuery(query: string, parameters?: Record<string, JsonValue>): SqlQueryResult {
        if (!parameters) {
            return { query, parameters: {} };
        }

        let modifiedQuery = query;
        const modifiedParameters: Record<string, unknown> = {};

        // Process each parameter
        for (const [paramName, paramValue] of Object.entries(parameters)) {
            if (this.shouldProcessAsInClause(paramValue)) {
                modifiedQuery = this.processInClause(modifiedQuery, paramName, paramValue);
            } else {
                const { processedQuery, processedParam } = this.processStandardParameter(
                    modifiedQuery,
                    paramName,
                    paramValue
                );
                modifiedQuery = processedQuery;
                
                if (processedParam !== undefined) {
                    modifiedParameters[paramName] = processedParam;
                }
            }
        }

        return { query: modifiedQuery, parameters: modifiedParameters };
    }

    private static shouldProcessAsInClause(value: JsonValue): boolean {
        return Array.isArray(value) && value.length > 0;
    }

    private static processInClause(query: string, paramName: string, values: JsonValue): string {
        const valueList = this.convertToValueList(values);
        
        // Replace table.@param pattern
        return query.replace(
            new RegExp(`(\\w+)\\.@${paramName}\\b`, 'g'),
            (_, prefix) => `${prefix}.${paramName} IN (${valueList})`
        );
    }

    private static processStandardParameter(
        query: string,
        paramName: string,
        value: JsonValue
    ): { processedQuery: string; processedParam: unknown } {
        let processedQuery = query;

        // Handle table.@param pattern
        processedQuery = processedQuery.replace(
            new RegExp(`(\\w+)\\.@${paramName}\\b`, 'g'),
            (_, prefix) => `${prefix}.${paramName} = @${paramName}`
        );

        // Handle standalone @param pattern
        processedQuery = processedQuery.replace(
            new RegExp(`(?<![\w\.])@${paramName}\\b(?!\.)`, 'g'),
            `@${paramName}`
        );

        return {
            processedQuery,
            processedParam: this.convertValue(value)
        };
    }

    private static convertToValueList(values: JsonValue): string {
        if (!Array.isArray(values)) return '';
        
        return values
            .map(value => {
                if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
                if (value === null) return 'NULL';
                return String(value);
            })
            .join(',');
    }

    private static convertValue(value: JsonValue): unknown {
        if (value === null) return null;
        if (typeof value === 'object' && !Array.isArray(value)) {
            return JSON.stringify(value);
        }
        return value;
    }
}

// Extension method
declare global {
    interface String {
        processSqlQuery(parameters?: Record<string, JsonValue>): SqlQueryResult;
    }
}

// Implement the extension method
String.prototype.processSqlQuery = function(parameters?: Record<string, JsonValue>): SqlQueryResult {
    return SqlQueryProcessor.processQuery(this.toString(), parameters);
};
