// type Parameter = {
//     type: string;
//     description?: string;
//     enum?: string[];
//     items?: {
//         type: string;
//         enum?: string[];
//     };
//     required?: boolean;
// };

// type FunctionSchema = {
//     name: string;
//     description: string;
//     parameters: {
//         type: 'object';
//         properties: Record<string, Parameter>;
//         required: string[];
//     };
// };

// function generateFunctionSchema(
//     func: Function,
//     description: string
// ): FunctionSchema {
//     const funcString = func.toString();
//     const params = extractParameters(funcString);

//     const schema: FunctionSchema = {
//         name: func.name || 'unnamed_function',
//         description: description,
//         parameters: {
//             type: 'object',
//             properties: {},
//             required: [],
//         },
//     };

//     // Process each parameter
//     for (const param of params) {
//         const paramType = inferParameterType(param.type);
//         schema.parameters.properties[param.name] = {
//             type: paramType.type,
//             description: param.description || `Parameter ${param.name}`,
//             ...(paramType.enum && { enum: paramType.enum }),
//             ...(paramType.items && { items: paramType.items }),
//         };

//         if (!param.hasDefaultValue) {
//             schema.parameters.required.push(param.name);
//         }
//     }

//     return schema;
// }

// function extractParameters(funcString: string) {
//     const paramRegex = /\(([\s\S]*?)\)/;
//     const match = funcString.match(paramRegex);
//     if (!match?.[1]) return [];

//     return match[1].split(',').map((param) => {
//         // Clean up the parameter string
//         param = param.trim();

//         // Check for default value
//         const [paramDef, defaultValue] = param.split('=').map((p) => p.trim());
//         const hasDefaultValue = defaultValue !== undefined;

//         // Split name and type
//         let [name, type = 'any'] = paramDef.split(':').map((p) => p.trim());

//         // If there's a default value, use it to infer type if type is not explicitly specified
//         if (hasDefaultValue && type === 'any') {
//             if (
//                 defaultValue === 'true' ||
//                 defaultValue === 'false' ||
//                 defaultValue === '!0' ||
//                 defaultValue === '!1'
//             ) {
//                 type = 'boolean';
//             } else if (!isNaN(Number(defaultValue))) {
//                 type = 'number';
//             } else if (
//                 defaultValue.startsWith('"') ||
//                 defaultValue.startsWith("'")
//             ) {
//                 type = 'string';
//             } else if (defaultValue.startsWith('[')) {
//                 type = 'array';
//             }
//         }

//         return {
//             name,
//             type,
//             hasDefaultValue,
//             defaultValue,
//         };
//     });
// }

// function inferParameterType(type: string): {
//     type: string;
//     enum?: string[];
//     items?: { type: string };
// } {
//     // Remove optional modifier and clean up type
//     type = type.replace('?', '').trim();

//     // Basic type mappings
//     const typeMap: Record<string, { type: string; items?: { type: string } }> =
//         {
//             string: { type: 'string' },
//             number: { type: 'number' },
//             boolean: { type: 'boolean' },
//             any: { type: 'string' },
//             'string[]': { type: 'array', items: { type: 'string' } },
//             'number[]': { type: 'array', items: { type: 'number' } },
//             array: { type: 'array', items: { type: 'string' } },
//         };

//     // Handle enum types
//     if (type.startsWith('"') || type.includes('|')) {
//         const enumValues = type
//             .split('|')
//             .map((t) => t.trim().replace(/['"]/g, ''));
//         return {
//             type: 'string',
//             enum: enumValues,
//         };
//     }

//     return typeMap[type] || { type: 'string' };
// }

// // Example usage
// function orderPizza(
//     size: 'small' | 'medium' | 'large',
//     toppings: string[],
//     extraCheese: boolean = !1
// ) {
//     // Function implementation
// }

// // Generate schema
// const schema = generateFunctionSchema(
//     orderPizza,
//     'Order a pizza with specified size, toppings, and extra cheese option'
// );

// // Example output
// console.log(JSON.stringify(schema, null, 2));
