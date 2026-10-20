import type { BreadcrumbEntry, FaqEntry, OfferDraft, PdpFormData } from '../model/types';
import { createBlankBreadcrumb, createBlankFaq, createBlankOffer } from '../lib/ids';
import { Field, FieldRow, SectionCard, SelectField } from './FormControls';

function ScopeSelect({ value, versions, onChange }: { value: string; versions: PdpFormData['versions']; onChange(value: string): void }) {
  const exists = value === 'page' || versions.some((version) => version.id === value);
  return <label className="field field--wide"><span className="field__label">Vincular oferta a</span><select value={value} onChange={(event) => onChange(event.target.value)}>
    <option value="page">Página / grupo (geral)</option>
    {!exists && <option value={value}>Versão removida — selecione outra</option>}
    {versions.map((version, index) => <option value={version.id} key={version.id}>Versão {index + 1}: {version.name || 'sem nome'}</option>)}
  </select></label>;
}

function OfferCard({ offer, index, versions, onChange, onDelete }: { offer: OfferDraft; index: number; versions: PdpFormData['versions']; onChange(offer: OfferDraft): void; onDelete(): void }) {
  const patch = (values: Partial<OfferDraft>) => onChange({ ...offer, ...values });
  return <div className="repeat-card">
    <div className="repeat-card__header"><span className="repeat-card__index">OFERTA {String(index + 1).padStart(2, '0')}</span><span className="repeat-card__title">{offer.name || (offer.price ? `${offer.price} ${offer.priceCurrency}` : 'Nova oferta')}</span>
      <button type="button" className="button button--small button--danger" onClick={onDelete}>Remover</button></div>
    <div className="repeat-card__body">
      <ScopeSelect value={offer.scope} versions={versions} onChange={(scope) => patch({ scope })} />
      <FieldRow>
        <Field label="Nome da oferta" value={offer.name} onChange={(name) => patch({ name })} placeholder="Opcional" />
        <Field label="Preço" value={offer.price} onChange={(price) => patch({ price })} inputMode="decimal" placeholder="Ex.: 129.990,00" />
        <Field label="Moeda (ISO 4217)" value={offer.priceCurrency} onChange={(priceCurrency) => patch({ priceCurrency: priceCurrency.toUpperCase() })} placeholder="BRL" />
        <Field label="URL da oferta" value={offer.url} onChange={(url) => patch({ url })} type="url" placeholder="https://…" />
        <SelectField label="Disponibilidade" value={offer.availability} onChange={(availability) => patch({ availability })} options={[
          ['InStock', 'Em estoque'], ['OutOfStock', 'Sem estoque'], ['PreOrder', 'Pré-venda'], ['BackOrder', 'Sob encomenda'],
          ['LimitedAvailability', 'Disponibilidade limitada'], ['OnlineOnly', 'Somente online'], ['Discontinued', 'Descontinuado'],
        ]} />
        <SelectField label="Condição" value={offer.itemCondition} onChange={(itemCondition) => patch({ itemCondition })} options={[
          ['NewCondition', 'Novo'], ['UsedCondition', 'Usado'], ['RefurbishedCondition', 'Recondicionado'], ['DamagedCondition', 'Danificado'],
        ]} />
        <Field label="Válida até" value={offer.priceValidUntil} onChange={(priceValidUntil) => patch({ priceValidUntil })} type="date" />
        <Field label="Nome do vendedor" value={offer.sellerName} onChange={(sellerName) => patch({ sellerName })} placeholder="Opcional" />
      </FieldRow>
      <p className="field__hint">Offer é gerado somente com preço numérico e moeda válida. Campos restantes são opcionais.</p>
    </div>
  </div>;
}

export function OffersEditor({ data, onChange }: { data: PdpFormData; onChange(data: PdpFormData): void }) {
  return <SectionCard id="offers" number="06" title="Ofertas" description="Várias ofertas gerais ou vinculadas a versões específicas; dados incompletos não geram Offer."
    aside={<button type="button" className="button button--primary button--small" onClick={() => onChange({ ...data, offers: [...data.offers, createBlankOffer('page')] })}>＋ Adicionar oferta</button>}>
    {data.offers.length ? <div className="repeat-list">{data.offers.map((offer, index) => <OfferCard key={offer.id} offer={offer} index={index} versions={data.versions}
      onChange={(next) => onChange({ ...data, offers: data.offers.map((item) => item.id === offer.id ? next : item) })}
      onDelete={() => onChange({ ...data, offers: data.offers.filter((item) => item.id !== offer.id) })} />)}</div>
      : <div className="empty-state empty-state--compact"><span className="empty-state__symbol">$</span><span>Nenhuma oferta; o grafo não incluirá Offer.</span></div>}
  </SectionCard>;
}

export function BreadcrumbEditor({ data, onChange }: { data: PdpFormData; onChange(data: PdpFormData): void }) {
  const patch = (entry: BreadcrumbEntry, values: Partial<BreadcrumbEntry>) => onChange({ ...data, breadcrumbs: data.breadcrumbs.map((item) => item.id === entry.id ? { ...item, ...values } : item) });
  return <SectionCard id="navigation" number="07" title="Breadcrumbs" description="Uma BreadcrumbList só será criada com itens nomeados e URLs válidas."
    aside={<button type="button" className="button button--secondary button--small" onClick={() => onChange({ ...data, breadcrumbs: [...data.breadcrumbs, createBlankBreadcrumb()] })}>＋ Adicionar item</button>}>
    {data.breadcrumbs.length ? <div className="repeat-list">{data.breadcrumbs.map((item, index) => <div className="repeat-card" key={item.id}>
      <div className="repeat-card__header"><span className="repeat-card__index">NÍVEL {String(index + 1).padStart(2, '0')}</span><span className="repeat-card__title">{item.name || 'Novo item'}</span>
        <button type="button" className="button button--small button--danger" onClick={() => onChange({ ...data, breadcrumbs: data.breadcrumbs.filter((entry) => entry.id !== item.id) })}>Remover</button></div>
      <FieldRow><Field label="Nome" value={item.name} onChange={(name) => patch(item, { name })} /><Field label="URL" value={item.url} onChange={(url) => patch(item, { url })} type="url" placeholder="https://…" wide /></FieldRow>
    </div>)}</div> : <div className="empty-state empty-state--compact"><span className="empty-state__symbol">NAV</span><span>Nenhum breadcrumb cadastrado.</span></div>}
  </SectionCard>;
}

export function FaqEditor({ data, onChange }: { data: PdpFormData; onChange(data: PdpFormData): void }) {
  const patch = (entry: FaqEntry, values: Partial<FaqEntry>) => onChange({ ...data, faqs: data.faqs.map((item) => item.id === entry.id ? { ...item, ...values } : item) });
  return <SectionCard id="faq" number="08" title="Perguntas frequentes" description="FAQPage, Question e Answer só aparecem quando pergunta e resposta estão completas."
    aside={<button type="button" className="button button--secondary button--small" onClick={() => onChange({ ...data, faqs: [...data.faqs, createBlankFaq()] })}>＋ Adicionar pergunta</button>}>
    {data.faqs.length ? <div className="repeat-list">{data.faqs.map((item, index) => <div className="repeat-card" key={item.id}>
      <div className="repeat-card__header"><span className="repeat-card__index">FAQ {String(index + 1).padStart(2, '0')}</span><span className="repeat-card__title">{item.question || 'Nova pergunta'}</span>
        <button type="button" className="button button--small button--danger" onClick={() => onChange({ ...data, faqs: data.faqs.filter((entry) => entry.id !== item.id) })}>Remover</button></div>
      <FieldRow><Field label="Pergunta" value={item.question} onChange={(question) => patch(item, { question })} rows={2} wide /><Field label="Resposta" value={item.answer} onChange={(answer) => patch(item, { answer })} rows={3} wide /></FieldRow>
    </div>)}</div> : <div className="empty-state empty-state--compact"><span className="empty-state__symbol">FAQ</span><span>Nenhuma pergunta cadastrada.</span></div>}
  </SectionCard>;
}
