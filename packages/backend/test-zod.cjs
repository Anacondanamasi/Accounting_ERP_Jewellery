const { z } = require("zod");

const schema = z.object({
  groupId: z.coerce.number().int().nonnegative().optional().nullable(),
});

console.log("null:", schema.safeParse({ groupId: null }));
console.log("0:", schema.safeParse({ groupId: 0 }));
console.log("undefined:", schema.safeParse({ groupId: undefined }));
console.log("missing:", schema.safeParse({}));
