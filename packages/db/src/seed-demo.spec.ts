import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { splitSqlStatements } from "./seed-demo.js"

describe("splitSqlStatements", () => {
  it("does not split semicolons inside SQL string literals", () => {
    const statements = splitSqlStatements(`
      insert into listing_images (blur_data_url)
      values ('data:image/webp;base64,UklGRiIAAABXRUJQVlA4');

      select 1;
    `)

    assert.equal(statements.length, 2)
    assert.match(statements[0] ?? "", /data:image\/webp;base64/)
    assert.equal(statements[1], "select 1")
  })
})
