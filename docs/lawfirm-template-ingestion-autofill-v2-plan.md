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

### 4.5 Field order và review navigation

- Thứ tự review là dữ liệu dẫn xuất bền vững từ document structure/anchor, không phải thứ tự detector phát hiện hoặc thứ tự AI trả về.
- Mỗi occurrence có một `sourceOrderKey` ổn định; mỗi field lấy occurrence đầu tiên làm `firstOccurrenceOrderKey`.
- Trong một document, field mặc định hiển thị theo thứ tự đọc từ trên xuống dưới, trái sang phải; field thủ công không có anchor nằm sau field có anchor.
- Ở cấp template set, thứ tự ổn định là `(document.sortOrder, firstOccurrenceOrderKey, field.id)`.
- Một semantic field chỉ có một review card; các occurrence lặp lại cùng trỏ tới card đó.
- Preview và field panel phải dùng stable ID/occurrence key để điều hướng hai chiều; không dùng label, raw text hoặc array index làm navigation identity.

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

### 12.4 Ordered review navigator

Mặc định field panel của document active dùng thứ tự đọc trong tài liệu, không dùng alphabetical order hoặc detector order. Search/filter chỉ thu hẹp tập kết quả và giữ nguyên relative order.

```text
Preview occurrence click
  → select semantic field
  → mở field panel nếu đang đóng
  → scroll card tương ứng vào giữa viewport
  → focus/active state có thời hạn

Field card/occurrence navigation
  → scroll preview tới occurrence hiện tại
  → highlight active occurrence
  → cho phép next/previous nếu field xuất hiện nhiều lần
```

Kế thừa pattern đã có ở `/clm/editor`:

- `data-field-key`/stable DOM marker;
- click canvas → focus RightPanel;
- RightPanel → canvas `scrollIntoView` + temporary ring;
- panel tự mở trước khi scroll.

Không tái sử dụng nguyên `CanvasEditor`/`RightPanel` vì chúng phụ thuộc TipTap, editor Zustand store và CLM document mutation. Trích navigation contract/hook dùng chung; Lawfirm giữ renderer DOCX/HTML riêng và dùng `data-occurrence-key`, `data-template-field-id`.

Current `PreviewPane` đang highlight bằng raw string replacement trên Mammoth HTML. Phase này phải chuyển sang anchor/occurrence-driven annotation; raw-text matching chỉ là fallback có badge cảnh báo và không được dùng làm durable identity.

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

- [x] Tạo `GeminiMappingGateway` duy nhất.
- [x] Structured output schema.
- [x] Candidate-constrained prompt.
- [x] Chunking theo unique unresolved slots và token estimate.
- [x] Routing deterministic → Gemini Flash → human review.
- [x] Application mapping cache.
- [x] Rate limiter, retry/backoff, circuit breaker.
- [x] Usage/latency/correction metrics.
- [x] Human review gate cho low-confidence/conflict.

**Exit criteria:** Typical set dùng 0–1 call; không có invalid canonical key được persist.

### Phase 3.5 — Ordered field review và synchronized document navigation

**Mục tiêu:** Biến màn hình review thành luồng đọc có thứ tự ổn định và đồng bộ hai chiều giữa document occurrence với semantic field card trước khi bước sang entity-aware fill.

#### 3.5.1 Canonical source order

- [ ] Mở rộng anchor contract với vị trí so sánh được:
  - DOCX: `partRank`, `xmlOffset`/`blockIndex`, `inlineOffset`, table row/cell fallback;
  - PDF/OCR: `pageIndex`, `y`, `x`, region index;
  - fallback legacy: persisted `sortOrder`, không dùng label.
- [ ] Detector thu thập occurrence rồi chạy một canonical comparator chung; không phụ thuộc detector pass order.
- [ ] Persist `DocumentSlot.sortOrder` theo canonical occurrence order.
- [ ] Persist/update `LawfirmTemplateField.sortOrder` theo occurrence sớm nhất; manual field không anchor đứng sau discovered fields và giữ user order ổn định.
- [ ] Set index chọn earliest tuple `(document.sortOrder, slot.sortOrder)` cho semantic field order.
- [ ] Backfill idempotent cho document đã scan; dry-run report số field đổi vị trí trước khi apply.
- [ ] API luôn trả document fields/slots với explicit deterministic order và stable tiebreaker `id`.

#### 3.5.2 Anchor-aware preview

- [ ] Tạo preview annotation model gồm `occurrenceKey`, `templateFieldId`, `anchor`, `status`, `confidence`.
- [ ] Chèn marker vào HTML render bằng anchor transformation trước/sau Mammoth theo adapter có test; không quét lại toàn bộ raw placeholder trên mỗi React render.
- [ ] Cùng raw text xuất hiện nhiều nơi vẫn tạo các marker occurrence riêng, không highlight nhầm mọi chuỗi giống nhau.
- [ ] Header/footer/table/content control/blank/literal occurrence dùng cùng DOM identity contract.
- [ ] PDF/OCR chưa có tọa độ đáng tin cậy phải hiển thị degraded state rõ ràng; không giả vờ click-sync chính xác.

#### 3.5.3 Shared field navigation controller

- [ ] Trích pattern từ `/clm/editor` thành client-side navigation controller/hook không phụ thuộc TipTap hoặc Zustand.
- [ ] Dùng React state/ref registry thay cho global event name hard-code; CLM có adapter tương thích để không regression.
- [ ] Preview click chọn `templateFieldId + occurrenceKey`, tự mở panel và scroll đúng card.
- [ ] Field card click/Enter scroll preview tới occurrence; field lặp có điều khiển previous/next và chỉ một active occurrence.
- [ ] Dùng `CSS.escape`/ref map cho ID tùy ý; hủy timer/listener khi unmount hoặc đổi document.
- [ ] `prefers-reduced-motion` dùng scroll instant; keyboard Enter/Space, `aria-current`, visible focus và không cướp focus khi người dùng đang nhập.

#### 3.5.4 Field panel information architecture

- [ ] Default view: document reading order, một card/semantic field, occurrence count và mapping status.
- [ ] Filter `Tất cả / Cần kiểm tra / Chưa ánh xạ`; filter không thay đổi relative order.
- [ ] Search label/canonical key/raw alias; clear search khôi phục chính xác source order.
- [ ] Card active dùng border/background restrained theo Notion style; không thêm icon trang trí.
- [ ] Với danh sách lớn, dùng single scroll owner và virtualization hoặc measured list; không tạo nested scroll container theo từng group như CLM RightPanel hiện tại.
- [ ] Giữ draft edit theo field ID khi virtualize; scroll không làm mất input state.

#### 3.5.5 State, performance và regression

- [ ] Active selection scoped theo `templateSetId + documentId`; đổi file không rò selection cũ.
- [ ] Reload giữ persisted field order; active selection có thể reset mà không làm scan/AI chạy lại.
- [ ] Không Gemini call trong sort, highlight, click hoặc scroll flow.
- [ ] Không rebuild/sanitize toàn bộ preview khi chỉ đổi input value hoặc active occurrence.
- [ ] Contract tests cho comparator/backfill/API order; component tests cho click-sync hai chiều; test 100+ fields và repeated placeholders.
- [ ] Regression tests cho drag document order, durable scan state, mapping approval và token ledger.

**Exit criteria:** E01–E12 đạt; một document 100+ fields vẫn có thứ tự ổn định qua reload, click bất kỳ highlight nào đưa đúng card vào view, panel đưa preview tới đúng occurrence, và interaction không phát sinh Gemini call.

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

### E. Ordered review và synchronized navigation

- **E01:** Field từ placeholder, content control, blank và table cell cùng được sắp theo vị trí đọc thực tế, không theo detector kind.
- **E02:** Reload hoặc chạy lại index không làm đổi thứ tự khi document revision không đổi.
- **E03:** Cùng raw text tại nhiều vị trí tạo occurrence marker riêng; click vị trí thứ hai không nhảy về vị trí thứ nhất.
- **E04:** Nhiều occurrence cùng semantic field chỉ tạo một field card và hiển thị đúng occurrence count.
- **E05:** Click highlight trong preview tự mở panel, scroll đúng card và không gọi Gemini.
- **E06:** Click/Enter field card scroll preview tới occurrence active; previous/next đi đúng thứ tự.
- **E07:** Search/filter không phá relative source order; clear filter phục hồi đúng danh sách ban đầu.
- **E08:** Đổi document không rò active field/occurrence; quay lại vẫn dùng persisted order và không scan lại.
- **E09:** Manual field không có anchor nằm sau discovered fields và giữ stable user order qua update/reload.
- **E10:** Header/footer/table occurrence dùng stable navigation identity; unsupported/PDF degraded state được báo rõ.
- **E11:** Keyboard và reduced-motion flow hoạt động; navigation không cướp focus khỏi input đang edit.
- **E12:** Document 100+ fields không tạo nested-scroll trap, không mất draft khi virtualize và đạt interaction latency mục tiêu dưới 100 ms cho selection local.

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
| Phase 2 | Accepted | Đã nghiệm thu thủ công trên bộ DOCX thực tế |
| Phase 3 | Accepted | Đã nghiệm thu thủ công với Gemini thật |
| Phase 3.5 | In progress | Canonical source-order đã được persist; tiếp theo là preview annotation theo anchor |
| Phase 4 | In progress | Entity/value schema, legacy root-entity backfill và fill snapshots đã migrate local |
| Phase 5 | Not started | Chờ slot anchor contract |
| Phase 6 | Not started | Chờ các phase chức năng |

### Next executable task

Phase 3.5 implementation, song song giữ Phase 2 và Phase 3 ở acceptance:

1. Hoàn tất canonical source-order persistence, chạy dry-run backfill và xác nhận report trước khi apply.
2. Hoàn thiện anchor-aware preview annotation; raw-text matching chỉ là fallback có degraded badge.
3. Trích navigation controller từ pattern `/clm/editor`, nối anchor-aware preview và field panel.
4. Chạy E01–E12; sau đó manual acceptance B01–B09 và C01–C06 trên cùng bộ tài liệu thực tế.

### Phase 4 data foundation — 2026-08-14

- [x] Thêm `LawfirmProfileEntity` và `LawfirmProfileValue` với unique logical constraint entity + field definition + value index.
- [x] Backfill root entity và canonical profile values từ profile fields cũ trong migration.
- [x] Thêm profile/template/mapping snapshot columns cho fill run.
- [x] Profile create/update ghi root entity và canonical values trong cùng transaction với legacy fields.
- [x] Profile API trả entities và canonical values; giữ legacy fields để tương thích ngược.
- [x] Fill run materialize profile/template/mapping snapshots tại thời điểm chạy.
- [x] Backend: thêm durable entity selector cho từng template-set field; document navigation trả selector và API PATCH cập nhật có kiểm tra workspace access.
- [x] Backend: fill DOCX resolve theo `entity selector → canonical field → profile value`; chỉ fallback legacy root fields khi chưa có canonical entity value.
- [x] Frontend: hiển thị selector “Chủ thể áp dụng” trên field đã có template-set binding, persist optimistic qua API và rollback khi lỗi.
- [x] Backend: profile update revision-safe đồng bộ create/update/delete thực thể phụ và ProfileValue canonical trong transaction; root entity được bảo toàn.
- [x] Frontend: profile editor cho phép tạo, sửa, xoá thực thể phụ và các canonical values của chúng; thay đổi đi qua profile update revision-safe.
- [x] Khắc phục đường tải kết quả: backend không tạo ZIP rỗng khi mọi DOCX lỗi, endpoint trả binary attachment headers rõ ràng, và frontend hiển thị trạng thái output thật thay vì false success.
- [ ] Cần kiểm thử end-to-end nhiều thực thể với DOCX thật trước khi Phase 4 Accepted.

### Phase 3.5 implementation — 2026-08-14

- [x] Canonical comparator dùng part/XML/paragraph/table/control/inline offsets; scan worker persist field theo source order.
- [x] Set index và API giữ deterministic order với stable tiebreaker.
- [x] Có dry-run command `npm run lawfirm:backfill-source-order`; chỉ `--apply` mới ghi dữ liệu.
- [x] DOCX preview ưu tiên `paragraphIndex + inlineOffset + occurrenceKey`; hỗ trợ table-cell và paragraph-scoped Content Control khi anchor đủ tin cậy.
- [x] Text matching chỉ là fallback có degraded notice; PDF vẫn hiển thị degraded state.
- [x] Selection scope theo `templateSetId + documentId`, reduced motion và navigation không cướp focus.
- [x] Backend build, discovery/source-order tests và frontend type-check pass.
- [x] Backfill đã apply: 1 template set, 4 document, 90 field positions; dry-run sau apply trả về 0 thay đổi.
- [ ] Cần nghiệm thu E01–E12 trước khi chuyển Phase 3.5 sang Accepted.

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

### Phase 3 implementation verification — 2026-08-12

- Một logical mapping job cho mỗi template-set revision + input fingerprint; job stale có thể reclaim và UI poll trạng thái bền vững.
- Chỉ unique unresolved slots được gửi; mỗi slot có tối đa 6 canonical candidates và context bị giới hạn.
- Chunk tối đa 20 slots / khoảng 6.000 estimated tokens; hard cap 3 Gemini calls/job.
- Model mapping mặc định `gemini-2.5-flash`, có thể override bằng `LAWFIRM_GEMINI_MAPPING_MODEL`.
- Application cache khóa theo workspace + semantic fingerprint + taxonomy/prompt/model version.
- Workspace guard: tối đa 10 mapping events/phút; circuit mở sau 3 failure trong 2 phút.
- Invalid/out-of-candidate canonical key và confidence dưới 0,85 không được persist; chuyển human review.
- Footer Lawfirm báo input/output/thinking/cached/total tokens, retry, latency và từng tác vụ trong 30 ngày.
- Token lấy trực tiếp từ Gemini `usageMetadata`; deterministic parser và Tesseract OCR được ghi nhận là 0 Gemini token theo thiết kế.
- 31/31 migrations đã apply; C01–C06 với Gemini thật vẫn là acceptance gate.

### D-011 — Token ledger là dữ liệu backend, không ước lượng ở frontend

**Quyết định:** Mỗi Gemini call của Lawfirm ghi một usage event idempotent theo operation key. Footer chỉ tổng hợp ledger này và không tự ước lượng token từ độ dài chuỗi.

**Lý do:** Reload/navigation không làm tăng số liệu, retry được track rõ, và báo cáo phản ánh số token provider trả về cho từng công việc.

### D-012 — AI là bước hoàn thiện có chủ đích trong UX

**Quyết định:** Upload luôn chạy structured discovery và deterministic mapping. Gemini không tự chạy khi người dùng mới tải file; UI đọc mapping summary bền vững từ backend, hiển thị số trường đã ánh xạ/chưa rõ, số lượt Gemini dự kiến và chỉ chạy set-level resolver khi người dùng chọn “Phân tích … trường bằng AI”.

**Lý do:** Người dùng nhận kết quả cơ bản ngay, biết rõ khi nào quota được sử dụng và không tạo nhiều lần gọi theo từng file. Mapping job, kết quả và trạng thái xử lý nằm ở backend nên đổi tài liệu hoặc reload không làm mất tiến trình.

### D-013 — Source anchor quyết định order và navigation identity

**Quyết định:** Field review order được dẫn xuất từ earliest persisted occurrence anchor; preview/panel navigation dùng `occurrenceKey + templateFieldId`. Pattern click/scroll từ `/clm/editor` được trích thành navigation abstraction dùng chung, nhưng Lawfirm không phụ thuộc nguyên `CanvasEditor`, `RightPanel`, TipTap store hoặc global custom-event implementation.

**Lý do:** Detector order và raw-text matching không phản ánh document flow, dễ đảo danh sách và chọn sai khi chuỗi lặp. Stable anchor cho phép order, highlight, scroll và fill sau này cùng dùng một identity contract mà không gọi AI.

### Phase 3.5 architecture audit — 2026-08-12

- `/clm/editor` hiện dùng `data-field-key`, canvas click event, RightPanel `scrollIntoView`, panel-to-canvas event và temporary ring.
- CLM RightPanel đã sort field theo first merge-field occurrence, nhưng vẫn phân source và có nested scroll per group; chỉ tái sử dụng interaction pattern, không sao chép toàn bộ information architecture.
- Lawfirm hiện highlight bằng raw placeholder replacement trên Mammoth HTML; chuỗi giống nhau có thể cùng bị mark và không đại diện chính xác structured anchor.
- Backend đã có `DocumentSlot.anchor`, `occurrenceKey`, `sortOrder`, nhưng worker đang gán legacy field order theo detector result index; detector chạy nhiều pass nên thứ tự chưa phải visual source order.
- Phase 3.5 phải sửa ordering contract ở discovery/index/database trước frontend; frontend-only sort bị loại khỏi phương án đích.

### Phase 3 UX verification — 2026-08-12

- Bổ sung read-only mapping summary; đọc index/database, không gọi Gemini và không tiêu token.
- Một CTA AI duy nhất ở cấp bộ hồ sơ; bỏ CTA quét AI theo từng tài liệu.
- CTA hiển thị đúng unresolved field count, estimated Gemini calls và xác nhận chỉ phần chưa rõ được gửi.
- Có đường ánh xạ thủ công; trạng thái processing/error/completed phục hồi từ durable mapping job.
- Giao diện giữ phong cách Notion hiện hữu: chữ, khoảng trắng, divider và button trung tính; không thêm icon trang trí.
- 16 Lawfirm test suites / 43 tests pass; backend/frontend type-check và production build pass.
- Prisma xác nhận 31/31 migrations đã apply và database schema up to date.
- Manual UI acceptance và C01–C06 với Gemini thật do người dùng thực hiện sau; không được đánh dấu đạt chỉ bằng automated checks.
