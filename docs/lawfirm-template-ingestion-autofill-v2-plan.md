# Lawfirm Template Ingestion & Autofill V2

> **Vai trò tài liệu:** Single source of truth cho việc thiết kế, triển khai, migration và nghiệm thu pipeline Hồ sơ khách hàng → Bộ hồ sơ mẫu → Điền hồ sơ.
>
> **Trạng thái:** Approved / In progress
>
> **Cập nhật lần cuối:** 2026-08-11

## 1. Cách sử dụng tài liệu này

- Mọi thay đổi liên quan `lawfirm` profile fields, template scanning, Gemini mapping, DOCX slot detection hoặc autofill phải đối chiếu tài liệu này.
- Không triển khai phase sau khi acceptance criteria của phase trước chưa đạt, trừ khi task độc lập và không thay đổi contract của phase trước.
- Khi có quyết định kiến trúc mới, cập nhật mục **Decision log** trước hoặc cùng commit thay đổi code.
- Checkbox là trạng thái triển khai thực tế. Chỉ đánh dấu hoàn thành sau khi có test hoặc bằng chứng kiểm chứng tương ứng.
- Nếu code và tài liệu mâu thuẫn, tài liệu này là thiết kế đích; code hiện tại được xem là legacy cần migration, không phải nguồn định nghĩa nghiệp vụ.

## 2. Mục tiêu

Xây dựng pipeline có các đặc tính:

1. Mapping chính xác xuyên suốt nhiều DOCX trong cùng một bộ hồ sơ.
2. Phân biệt được “trùng đúng” và “trùng sai”.
3. Hỗ trợ tài liệu có placeholder và tài liệu không có placeholder.
4. Tốc độ xử lý tăng theo worker có giới hạn, không tạo một Gemini call cho mỗi document.
5. Số Gemini call phụ thuộc vào số semantic field duy nhất chưa giải quyết được.
6. Autofill dựa trên binding bền vững, không phụ thuộc label hoặc fuzzy text matching.
7. Có thể audit: biết field được phát hiện ở đâu, map vì sao, từ nguồn nào và revision nào.
8. Gemini lỗi hoặc hết quota không làm hỏng deterministic/manual workflow.

## 3. Lỗi gốc cần giải quyết

### 3.1 Các lỗi đã quan sát

1. Hai vị trí “Tên công ty” cùng nhận một giá trị.
2. “Địa chỉ trụ sở” nhận giá trị của “Tên công ty”.
3. Hai vị trí “Mã số thuế/Mã số doanh nghiệp” cùng ngữ nghĩa nhưng nhận hai giá trị khác nhau.

### 3.2 Kết luận nghiệp vụ

- Hai vị trí cùng `entity + canonical field` phải dùng cùng giá trị. Đây là **đồng bộ đúng**.
- Hai vị trí cùng label nhưng khác entity/role phải có thể dùng giá trị khác nhau.
- Hai vị trí khác canonical field không bao giờ được đồng bộ chỉ vì placeholder có từ giống nhau.
- Cùng `entity + canonical field` nhưng có hai giá trị khác nhau là conflict và phải chặn autofill.

### 3.3 Nguyên nhân kỹ thuật hiện tại

- Backend và frontend có hai taxonomy/mapping implementation khác nhau.
- Backend tồn tại cả generic key (`company_name`, `tax_id`, `address`) và key cũ dạng `f_*`.
- Fuzzy substring có thể map placeholder địa chỉ chứa từ “CÔNG TY” thành tên công ty.
- Frontend parse lại file sau backend và có thể ghi đè fields.
- `mappedKey` là chuỗi tự do, không có canonical registry hoặc referential validation.
- AI output không bị giới hạn chặt vào canonical key hợp lệ.
- Màn hình review hiển thị template label thay vì target profile field thật, che giấu mapping sai.

## 4. Invariants bắt buộc

### 4.1 Field identity

Field identity là:

```text
Entity instance / role + Canonical field definition
```

Ví dụ:

```text
client_company + organization.legal_name
client_company + organization.tax_id
client_company + organization.registered_address
representative_1 + person.full_name
```

Không sử dụng các giá trị sau làm semantic identity:

- label hiển thị;
- raw placeholder;
- database row UUID;
- AI-generated arbitrary key;
- thứ tự field trong mảng.

### 4.2 Mapping

- Mọi binding phải trỏ tới canonical field tồn tại.
- Một set-level field có một default binding.
- Document/occurrence override chỉ được tạo rõ ràng và phải có audit event.
- Cùng normalized slot và cùng context cluster không được có nhiều default binding.
- Không dùng substring matching để auto-approve.

### 4.3 Autofill

- Fill run chỉ chạy sau preflight thành công.
- Fill run sử dụng snapshot của profile values, template bindings và revisions.
- Một binding ID phải resolve ra tối đa một giá trị trong snapshot.
- Không mutation hồ sơ gốc từ màn hình fill nếu người dùng chưa chọn rõ “Lưu vào hồ sơ”.

### 4.4 AI

- Deterministic-first, AI-on-ambiguity.
- AI không được tạo canonical key mới.
- Output đúng JSON schema vẫn phải được semantic validation ở backend.
- Retry không được tạo duplicate logical job.
- Không gửi toàn bộ DOCX nếu chỉ cần resolve một danh sách slot đã được rút gọn.

## 5. Phạm vi tài liệu đầu vào

Pipeline phải hỗ trợ:

| Loại | Ví dụ | Chiến lược |
|---|---|---|
| Explicit placeholder | `[TÊN CÔNG TY]`, `{{mst}}` | Deterministic extraction |
| Word structure | Content Control, Bookmark, Merge Field | OOXML structural parsing |
| Blank form | dấu chấm, gạch dưới, ô bảng trống | Layout/label heuristic |
| Filled sample | `Tên công ty: Công ty ABC` | Candidate span + review |
| Narrative | dữ liệu nằm trong đoạn văn | Local candidate detection + AI review |
| Scanned content | ảnh trong DOCX | Selective OCR + review |

## 6. Kiến trúc đích

```text
Upload Session
  → Store + SHA-256
  → Document Parse Jobs
  → Slot Discovery
  → Normalize + Set-level Dedup
  → Deterministic Resolver
  → Gemini Resolver for Unique Unresolved Slots
  → Human Review
  → Preflight
  → Materialize Normalized DOCX Revision
  → Autofill by Durable Binding ID
```

### 6.1 Trạng thái document

```text
uploaded
parsing
slots_discovered
indexed
failed
```

### 6.2 Trạng thái template set revision

```text
collecting
indexing
resolving
needs_review
ready
failed
```

### 6.3 Trạng thái field/slot

```text
deterministic_mapped
ai_mapped
needs_review
conflict
unmapped
approved
```

## 7. Data model đích

Tên model cuối cùng có thể điều chỉnh theo convention Prisma hiện tại, nhưng quan hệ và invariants không được thay đổi tùy tiện.

### 7.1 `FieldDefinition`

```text
id
canonicalKey (unique)
entityType
dataType
labelVi
labelEn
validationRule
taxonomyVersion
status
```

Canonical key ban đầu:

```text
organization.legal_name
organization.tax_id
organization.registered_address
organization.contact_address
person.full_name
person.date_of_birth
person.personal_id
person.email
person.phone
representative.title
```

### 7.2 `FieldAlias`

```text
fieldDefinitionId
rawAlias
normalizedAlias
locale
priority
autoApproveEligible
```

### 7.3 `ProfileEntity`

```text
profileId
entityType
role
ordinal
displayName
```

### 7.4 `ProfileValue`

```text
profileEntityId
fieldDefinitionId
typedValue / rawValue
source
confidence
revision
```

Unique logical constraint:

```text
profileEntityId + fieldDefinitionId + valueIndex
```

`valueIndex` mặc định bằng 0 và chỉ dùng khi canonical field cho phép nhiều giá trị.

### 7.5 `TemplateSetField`

```text
templateSetRevisionId
normalizedSlot
displaySlot
defaultFieldDefinitionId
defaultEntitySelector
mappingStatus
mappingSource
confidence
contextFingerprint
```

### 7.6 `DocumentSlot`

```text
documentRevisionId
templateSetFieldId
sourceKind
rawText
labelText
currentValue
leftContext
rightContext
anchor JSON
occurrenceCount
bindingId
bindingOverride
```

`sourceKind`:

```text
explicit_placeholder
content_control
bookmark
merge_field
blank_line
dotted_blank
empty_table_cell
literal_value
ai_detected_span
ocr_region
```

### 7.7 `TemplateScanJob`

```text
workspaceId
templateSetId
templateRevision
uploadSessionId
jobType
status
idempotencyKey (unique)
attempt
inputTokens
outputTokens
cachedTokens
aiCallCount
errorMessage
```

## 8. Normalization và deterministic resolution

Normalization chính:

1. Unicode NFKC.
2. Decode XML entities.
3. Trim wrapper nhận diện được.
4. Collapse whitespace.
5. Chuẩn hóa underscore/dấu câu theo loại slot.
6. Case-fold theo locale.
7. Giữ dấu tiếng Việt trong signature chính.
8. Signature không dấu chỉ dùng để tạo candidate, không auto-approve.

Thứ tự resolver:

1. Durable binding hiện có.
2. Exact normalized alias.
3. Workspace-approved mapping history.
4. Taxonomy candidate scoring theo label + entity hints + context.
5. Gemini cho phần unresolved/ambiguous.
6. Human review.

## 9. Gemini call strategy

### 9.1 Input

Chỉ gửi unique unresolved slots:

```json
{
  "taxonomyVersion": 1,
  "slots": [
    {
      "id": "slot-group-id",
      "label": "Địa chỉ trụ sở chính của công ty",
      "contexts": ["Trụ sở chính đặt tại ..."],
      "candidateCanonicalKeys": [
        "organization.registered_address",
        "organization.contact_address",
        "organization.legal_name"
      ],
      "documentRefs": ["doc-1", "doc-2"]
    }
  ]
}
```

### 9.2 Output

```json
{
  "mappings": [
    {
      "id": "slot-group-id",
      "decision": "mapped",
      "canonicalKey": "organization.registered_address",
      "entityRole": "client_company",
      "confidence": 0.97,
      "reasonCode": "REGISTERED_OFFICE_CONTEXT"
    }
  ]
}
```

### 9.3 Validation

- Input ID phải tồn tại và chỉ xuất hiện một lần.
- `canonicalKey` phải tồn tại và thuộc allowed candidates/registry.
- `entityRole` phải hợp lệ.
- Không chấp nhận unknown properties nếu schema không cho phép.
- Missing/invalid output chuyển `needs_review`, không auto-create field.
- Low confidence hoặc context cluster bất đồng chuyển `needs_review/conflict`.

### 9.4 Call policy

- Một resolution job cho mỗi template set revision.
- Chunk theo cả số slot và estimated token budget.
- Không chia cùng một normalized slot/context cluster sang nhiều request.
- Fast model cho vòng đầu; review model chỉ cho low-confidence subset.
- Application cache là primary cache.
- Gemini Batch API chỉ dùng cho backfill/offline, không dùng cho interactive review.
- Toàn bộ call đi qua một gateway có rate limit, retry, circuit breaker và usage logging.

## 10. Durable binding và materialization

Sau khi duyệt, tạo normalized DOCX revision và chèn binding ID vào đúng OOXML anchor.

Ưu tiên Word Content Control:

```text
lawzy:binding:<uuid>
```

Fill engine resolve:

```text
bindingId
  → entity selector
  → canonical field
  → snapshot value
```

Không tiếp tục fill bằng fuzzy text matching sau khi template đã được materialize.

File upload gốc luôn được giữ nguyên. Normalized file là revision mới.

## 11. Preflight rules

Template không được chuyển `ready` hoặc chạy fill khi còn lỗi blocking:

- orphan/unknown canonical key;
- binding không resolve được entity;
- cùng binding resolve nhiều giá trị;
- cùng normalized slot/context cluster có nhiều default binding;
- cùng entity + canonical field có nhiều giá trị trái ngược;
- address map vào legal name;
- tax ID aliases cùng entity map vào hai canonical identity khác nhau;
- unsupported document không có normalized revision;
- pending scan job hoặc stale mapping revision.

Warning không blocking:

- field không bắt buộc đang trống;
- OCR confidence thấp nhưng slot không dùng;
- document PDF chỉ dùng để review, không fill.

## 12. UI đích

### 12.1 Template set field list

Một dòng semantic field, không lặp một dòng cho mỗi occurrence:

```text
Tên công ty
client_company · organization.legal_name
5 tài liệu · 12 vị trí
```

Có thể expand để xem document refs và occurrence count.

### 12.2 Document preview

- Chỉ render/highlight document đang mở.
- Highlight dựa trên discovered slot/binding, không gọi AI.
- Hiển thị source kind, confidence và mapping status.

### 12.3 Fill review

Hiển thị đúng:

```text
Raw slot
Document
Entity/role
Canonical field
Profile value
Mapping source
Conflict status
```

Không dùng template field label để giả làm target profile field label.

## 13. Implementation phases

### Phase 0 — Containment và canonical mapping nền tảng

**Mục tiêu:** Chặn ba lỗi hiện tại trước khi mở rộng kiến trúc.

- [x] Tạo canonical taxonomy dùng chung ở backend.
- [x] Thêm legacy-key canonicalizer.
- [x] Xóa generic/canonical duplicate mappings khỏi detector.
- [x] Thay substring auto-match bằng normalized exact/candidate-only matching.
- [x] Backend validate `mappedKey` trước khi persist.
- [x] Backend validate AI `fieldKey/mappedKey` trước approve.
- [x] Dừng frontend parse/scan ghi đè kết quả backend.
- [x] Chặn hai auto scanner gọi cùng document.
- [x] Giữ AI review state theo `documentId` và persist pending template scan để navigation/reload không gọi lại Gemini.
- [x] Persist document drag-and-drop order bằng batch transaction, optimistic UI và rollback.
- [x] Sửa fill review hiển thị target field thật.
- [x] Reset/scoped edited state theo profile + template.
- [x] Thêm preflight conflict validator tối thiểu.
- [x] Thêm test tái hiện ba lỗi trong ảnh.
- [x] Thêm service-level tests cho preflight response và AI approval validation.

**Exit criteria:** Acceptance tests A01–A08 đạt.

### Phase 1 — Set-level registry, upload session và durable queue

- [x] Thêm schema `FieldDefinition` và `FieldAlias`.
- [x] Seed canonical taxonomy version 1.
- [x] Thêm contract/API cho workspace custom-field registry.
- [x] Thêm `TemplateSetField` và `DocumentSlot/Occurrence`.
- [x] Thêm upload session API.
- [x] Thêm durable scan job và idempotency.
- [x] Parse documents bằng bounded worker concurrency.
- [x] Dedup fields ở cấp template set.
- [x] Thêm scan-status API và progress UI.

**Exit criteria:** 10 DOCX trong một session parse/index đúng; không tạo Gemini call theo số document.

### Phase 2 — Slot Discovery không phụ thuộc placeholder

- [x] OOXML text reconstruction xuyên Word runs.
- [x] Explicit placeholder detector.
- [x] Content Control/Bookmark/Merge Field detector.
- [x] Dotted/underscore blank detector.
- [x] Empty table cell + label detector.
- [x] Literal sample candidate detector.
- [x] Selective OCR adapter và image hash cache.
- [x] Lưu anchor/context/source kind/provenance.

**Exit criteria:** Acceptance tests B01–B09 đạt trên fixture DOCX thực tế.

### Phase 3 — Set-level Gemini resolver

- [ ] Tạo `GeminiMappingGateway` duy nhất.
- [ ] Structured output schema.
- [ ] Candidate-constrained prompt.
- [ ] Chunking theo unique unresolved slots và token estimate.
- [ ] Two-tier model routing.
- [ ] Application mapping cache.
- [ ] Rate limiter, retry/backoff, circuit breaker.
- [ ] Usage/latency/correction metrics.
- [ ] Human review UI cho low-confidence/conflict.

**Exit criteria:** Typical set dùng 0–1 call; không có invalid canonical key được persist.

### Phase 4 — Entity-aware profiles và fill snapshot

- [ ] Thêm `ProfileEntity` và `ProfileValue`.
- [ ] Migrate profile fields hiện tại vào root entity phù hợp.
- [ ] Entity selector trong template bindings.
- [ ] Fill-run overrides tách khỏi master profile.
- [ ] Snapshot profile/template/mapping revisions.
- [ ] Preflight đầy đủ trước fill.

**Exit criteria:** Cùng field trên hai entity khác nhau không bị đồng bộ; cùng binding luôn nhất quán.

### Phase 5 — Durable DOCX binding

- [ ] Materialize normalized DOCX revision.
- [ ] Chèn `lawzy:binding:<uuid>` Content Controls.
- [ ] Fill engine theo binding ID.
- [ ] Giữ original file và revision lineage.
- [ ] Header/footer/footnote/endnote support.
- [ ] Fallback và cảnh báo cho unsupported OOXML structures.

**Exit criteria:** Autofill không phụ thuộc raw placeholder text cho normalized templates.

### Phase 6 — Migration, rollout và cleanup

- [x] Audit legacy profiles/template mappings bằng read-only dry-run tool.
- [ ] Auto-merge legacy keys chỉ khi values không conflict.
- [ ] Tạo review queue cho conflicting legacy values.
- [ ] Backfill normalized signatures và template-set fields.
- [ ] Feature flag theo workspace.
- [ ] Shadow preflight trên dữ liệu cũ.
- [ ] Theo dõi metrics trước khi chuyển default.
- [ ] Loại bỏ legacy frontend taxonomy/scanner/filler path.

## 14. Acceptance tests

### A. Mapping correctness

- **A01:** Hai `Tên công ty` cùng entity/canonical field dùng cùng giá trị.
- **A02:** Hai công ty khác entity có thể có hai tên khác nhau.
- **A03:** Placeholder địa chỉ chứa từ “CÔNG TY” không map thành legal name.
- **A04:** `[MST]`, `[MÃ SỐ THUẾ]`, `[MÃ SỐ DOANH NGHIỆP]` cùng entity resolve về `organization.tax_id`.
- **A05:** Cùng tax binding nhưng hai giá trị khác nhau tạo blocking conflict.
- **A06:** AI trả arbitrary key bị reject.
- **A07:** Fill review hiển thị target profile field thật.
- **A08:** Đổi profile/template không làm edited value rò sang selection mới.

### B. Discovery và multi-document

- **B01:** 10 DOCX upload trong một session được parse đầy đủ.
- **B02:** Placeholder giống nhau trong nhiều file tạo một set-level field và nhiều occurrences.
- **B03:** Content Control được nhận diện không cần AI.
- **B04:** Label + dotted blank được nhận diện.
- **B05:** Label + empty table cell được nhận diện.
- **B06:** Filled sample tạo review candidate, không auto-replace.
- **B07:** Narrative candidate không được auto-approve khi context yếu.
- **B08:** DOCX image OCR chỉ chạy cho ảnh cần thiết và dùng cache theo hash.
- **B09:** Highlight chỉ document active và không phát sinh AI call.

### C. Queue và Gemini

- **C01:** AI call count phụ thuộc unique unresolved slots, không phụ thuộc document count.
- **C02:** Cùng idempotency key không tạo hai logical jobs.
- **C03:** Concurrent parent/editor actions không tạo duplicate AI call.
- **C04:** 429/503 retry có backoff và không duplicate result.
- **C05:** Gemini unavailable vẫn cho phép manual mapping.
- **C06:** Usage metrics ghi đúng model, tokens, latency, retries và result count.

### D. Autofill

- **D01:** Một binding xuất hiện nhiều parts/documents được fill nhất quán.
- **D02:** Fill run snapshot không đổi khi profile bị sửa trong lúc generate.
- **D03:** Conflict blocking không thể bypass bằng UI thông thường.
- **D04:** Original DOCX không bị ghi đè khi materialize normalized revision.

## 15. Migration rules ban đầu

```text
company_name, f_to_ten
  → organization.legal_name

tax_id, f_to_mst
  → organization.tax_id

address, f_to_diachi
  → organization.registered_address
```

- Cùng canonical target và cùng value: có thể auto-merge.
- Cùng canonical target nhưng khác value: không merge; tạo conflict review item.
- Unknown key: giữ raw data, đánh dấu orphan và yêu cầu review.
- Migration phải idempotent, có dry-run và report trước khi apply.

## 16. Observability và success metrics

Theo dõi theo workspace và template set revision:

- documents uploaded/parsed/failed;
- total slot occurrences;
- unique set-level fields;
- deterministic resolution rate;
- Gemini calls và input/output/cached tokens;
- cache hit rate;
- time to first indexed document;
- time from upload complete đến review-ready;
- conflicts/unmapped fields;
- human correction rate;
- preflight failure reasons;
- fill success/no-match/error counts.

Mục tiêu pilot ban đầu:

- Không persist invalid canonical key.
- Không có duplicate Gemini logical job cho cùng revision.
- Typical explicit-placeholder template set dùng 0–1 Gemini call.
- Mọi conflict từ ba lỗi gốc được phát hiện trước fill.
- Deterministic/manual flow hoạt động khi Gemini bị tắt.

## 17. Out of scope ban đầu

- Tự động sửa nội dung pháp lý của tài liệu.
- Suy diễn giá trị hồ sơ khách hàng không có trong nguồn được duyệt.
- Autofill PDF không có form fields.
- Tự động approve literal/narrative candidate có confidence thấp.
- Dùng Gemini Batch API cho interactive workflow.

## 18. Decision log

### D-001 — Canonical identity thay cho label identity

**Quyết định:** Mapping dựa trên `entity selector + canonical field definition`.

**Lý do:** Cùng label có thể thuộc nhiều entity; khác label/alias có thể cùng một semantic field.

### D-002 — Backend là scanner authority

**Quyết định:** Frontend không parse lại rồi persist fields thay cho backend result.

**Lý do:** Tránh hai taxonomy, hai ordering và hai kết quả mapping cạnh tranh.

### D-003 — Deterministic-first

**Quyết định:** Gemini chỉ resolve unique unresolved/ambiguous slots.

**Lý do:** Tối ưu latency, quota, khả năng giải thích và fallback.

### D-004 — Set-level semantics, document-level occurrences

**Quyết định:** Semantic field được dedup ở template-set level; occurrence vẫn được giữ theo document.

**Lý do:** Giảm UI/AI duplication nhưng không mất vị trí fill/highlight.

### D-005 — Durable binding after approval

**Quyết định:** Normalized template dùng binding ID trong OOXML.

**Lý do:** Loại bỏ phụ thuộc vào raw placeholder/fuzzy text matching trong autofill.

### D-006 — Custom field key contract

**Quyết định:** Template chỉ được persist mapping thuộc canonical/current/legacy taxonomy hoặc durable custom key có dạng `custom-<stable-id>`; legacy/canonical key luôn được chuẩn hóa về current profile key khi ghi.

**Lý do:** Cho phép trường do người dùng tạo nhưng chặn AI/client ghi arbitrary key và tạo silent mapping sai.

### D-007 — Pending scan là durable server state

**Quyết định:** Kết quả template scan chờ duyệt được lưu trong `LawfirmAiExtraction` theo `documentId` và content fingerprint; UI giữ state machine riêng cho từng document.

**Lý do:** Đổi file không làm mất kết quả/in-flight state, reload có thể phục hồi kết quả đã chạy, và cùng một nội dung không tiêu tốn thêm Gemini call.

### D-008 — Document order là backend state

**Quyết định:** Drag-and-drop cập nhật UI ngay, sau đó persist toàn bộ ordered document ID list trong một transaction có revision check; lỗi persistence phải rollback UI.

**Lý do:** Tránh reorder chỉ mang tính trình diễn, tránh N request cho N tài liệu và không để backend lưu thứ tự dở dang.

### D-009 — Durable jobs dùng database lease

**Quyết định:** Upload nhiều file tạo `parse_document` jobs idempotent theo content fingerprint; worker claim tối đa ba jobs bằng lease có thời hạn và chỉ tạo một `index_template_set` job cho mỗi session.

**Lý do:** Restart/multi-instance không làm mất job hoặc chạy trùng logical work; số Gemini call không phụ thuộc số document và set-level index chỉ rebuild một lần khi session finalize.

### D-010 — Structured discovery trước AI

**Quyết định:** Reconstruct text trực tiếp từ OOXML parts và chạy detector độc lập cho placeholder, Content Control, Bookmark, Merge Field, blank, table cell và literal sample; OCR chỉ chạy chọn lọc khi text/structured slots chưa đủ và cache theo workspace + image hash.

**Lý do:** Không phụ thuộc ngoặc vuông, giữ được anchor/provenance để highlight/fill về sau và không tiêu tốn Gemini quota cho cấu trúc Word có thể xác định bằng code.

## 19. Current execution status

| Phase | Status | Ghi chú |
|---|---|---|
| Phase 0 | In progress | Checklist containment hoàn tất; còn acceptance A01–A08 |
| Phase 1 | Ready for acceptance | Phase 1.1–1.3 đã migrate/seed local; chờ manual acceptance với 10 DOCX |
| Phase 2 | Ready for acceptance | Detector/schema/cache đã migrate local; chờ B01–B09 trên bộ DOCX thực tế |
| Phase 3 | Not started | Chờ canonical registry contract |
| Phase 4 | Not started | Chờ schema/migration design review |
| Phase 5 | Not started | Chờ slot anchor contract |
| Phase 6 | Not started | Chờ các phase chức năng |

### Next executable task

Phase 2 acceptance, sau đó Phase 3.1:

1. Chạy B01–B09 với DOCX thực tế có Content Control, table blank, literal sample và ảnh.
2. Sửa detector false-positive/anchor nếu fixture thực tế phát hiện khác biệt.
3. Bắt đầu `GeminiMappingGateway` set-level cho unique unresolved slots.

### Legacy audit baseline — 2026-08-11

Read-only command: `npm run lawfirm:audit-fields`.

- Profile fields: 166.
- Template fields: 359.
- Legacy keys có thể normalize tự động: 21.
- Unknown keys sau khi bổ sung taxonomy: 0.
- Profile semantic-value conflicts: 0.
- Template mapping conflicts cần review/remediation: 6.
- Không có database write trong lần audit này.

### Phase 1 local database verification — 2026-08-11

- 30/30 migrations đã apply; schema up to date.
- Taxonomy v1 seed idempotent: 29 definitions, 122 aliases.
- Upload session/scan job tables hoạt động và đang rỗng trước manual test.
- Audit sau seed: 0 unknown key, 0 profile value conflict; 6 legacy template mapping conflicts vẫn giữ để review, không auto-merge sai.

### Phase 2 implementation verification — 2026-08-11

- Structured OOXML discovery đã nối xuyên suốt parser, scan worker, persistence, set index và UI provenance.
- 13 lawfirm test suites / 37 tests pass; backend và frontend type-check pass.
- Backend Nest build và frontend Next production build pass.
- Prisma Client generate thành công; 30/30 migrations đã apply và schema up to date.
- Targeted lint không có error; các warning còn lại là technical debt có sẵn trong `template-panel.tsx`.
- B01–B09 với bộ DOCX thực tế vẫn là acceptance gate, chưa được đánh dấu đạt chỉ bằng synthetic fixtures.
