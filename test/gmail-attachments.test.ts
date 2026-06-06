import assert from "node:assert/strict"
import test from "node:test"
import { toUnifiedRecord } from "../src/platforms/gmail/toUnifiedRecord"

test("gmail normalization preserves attachment size when data is not inline", () => {
  let row = toUnifiedRecord({
    id: "m1",
    threadId: "t1",
    internalDate: String(Date.parse("2026-03-20T10:00:00Z")),
    labelIds: ["INBOX"],
    payload: {
      headers: [{ name: "From", value: "Alice <alice@example.com>" }],
      mimeType: "multipart/mixed",
      parts: [
        {
          mimeType: "text/plain",
          body: {
            data: Buffer.from("hi there", "utf8").toString("base64url"),
          },
        },
        {
          filename: "report.pdf",
          mimeType: "application/pdf",
          body: {
            attachmentId: "a1",
            size: 1234,
          },
        },
      ],
    },
  }, "default")

  assert.equal(row.attachments[0]?.filename, "report.pdf")
  assert.equal(row.attachments[0]?.sizeBytes, 1234)
})

test("gmail normalization extracts inline disposition and content id", () => {
  let row = toUnifiedRecord({
    id: "m2",
    threadId: "t2",
    internalDate: String(Date.parse("2026-03-20T10:00:00Z")),
    labelIds: ["INBOX"],
    payload: {
      headers: [{ name: "From", value: "Alice <alice@example.com>" }],
      mimeType: "multipart/related",
      parts: [
        {
          filename: "signature.png",
          mimeType: "image/png",
          headers: [
            { name: "Content-Disposition", value: "inline; filename=\"signature.png\"" },
            { name: "Content-ID", value: "<sig123@mail.example.com>" },
          ],
          body: { attachmentId: "a2", size: 4096 },
        },
        {
          filename: "report.pdf",
          mimeType: "application/pdf",
          headers: [{ name: "Content-Disposition", value: "attachment; filename=\"report.pdf\"" }],
          body: { attachmentId: "a3", size: 9000 },
        },
      ],
    },
  }, "default")

  assert.equal(row.attachments[0]?.disposition, "inline")
  assert.equal(row.attachments[0]?.contentId, "sig123@mail.example.com")
  assert.equal(row.attachments[1]?.disposition, "attachment")
  assert.equal(row.attachments[1]?.contentId, undefined)
})
