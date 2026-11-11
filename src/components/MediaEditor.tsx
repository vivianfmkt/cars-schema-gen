import type { ImageDraft, PdpFormData, VideoDraft } from '../model/types';
import { createBlankImage, createBlankVideo } from '../lib/ids';
import { Field, FieldRow, SectionCard, SelectField, Subheading } from './FormControls';

function ScopeSelect({ value, versions, onChange }: { value: string; versions: PdpFormData['versions']; onChange(value: string): void }) {
  const known = value === 'page' || versions.some((version) => version.id === value);
  return <label className="field field--wide"><span className="field__label">Associar a<code className="field__schema-property">associatedMedia</code></span><select value={value} onChange={(event) => onChange(event.target.value)}>
    <option value="page">Página / modelo (geral)</option>
    {!known && <option value={value}>Versão removida — selecione outra</option>}
    {versions.map((version, index) => <option value={version.id} key={version.id}>Versão {index + 1}: {version.name || 'sem nome'}</option>)}
  </select><span className="field__hint">A mídia geral é relacionada à página e às versões; a mídia específica só à versão escolhida.</span></label>;
}

function ImageCard({ image, index, versions, onChange, onDelete }: { image: ImageDraft; index: number; versions: PdpFormData['versions']; onChange(image: ImageDraft): void; onDelete(): void }) {
  const patch = (values: Partial<ImageDraft>) => onChange({ ...image, ...values });
  return <details className="media-card" open={index === 0}>
    <summary><span className="media-card__index">IMG {String(index + 1).padStart(2, '0')}</span><span className="media-card__title">{image.name || image.contentUrl || 'Nova imagem'}</span><span className="media-card__chevron">⌄</span></summary>
    <div className="media-card__body">
      <ScopeSelect value={image.scope} versions={versions} onChange={(scope) => patch({ scope })} />
      <FieldRow>
        <Field label="URL do arquivo de imagem" schemaProperty="contentUrl" value={image.contentUrl} onChange={(contentUrl) => patch({ contentUrl })} type="url" placeholder="https://…" wide />
        <Field label="URL da miniatura" schemaProperty="thumbnailUrl" value={image.thumbnailUrl} onChange={(thumbnailUrl) => patch({ thumbnailUrl })} type="url" placeholder="https://…" />
        <Field label="Nome" schemaProperty="name" value={image.name} onChange={(name) => patch({ name })} />
        <Field label="Texto alternativo" schemaProperty="caption" value={image.alt} onChange={(alt) => patch({ alt })} />
        <Field label="Legenda" schemaProperty="caption" value={image.caption} onChange={(caption) => patch({ caption })} />
        <Field label="Formato (MIME)" schemaProperty="encodingFormat" value={image.encodingFormat} onChange={(encodingFormat) => patch({ encodingFormat })} placeholder="image/webp" />
        <Field label="Descrição" schemaProperty="description" value={image.description} onChange={(description) => patch({ description })} rows={2} wide />
        <Field label="Largura" schemaProperty="width" value={image.width} onChange={(width) => patch({ width })} unit="px" inputMode="numeric" />
        <Field label="Altura" schemaProperty="height" value={image.height} onChange={(height) => patch({ height })} unit="px" inputMode="numeric" />
        <Field label="Tamanho do arquivo" schemaProperty="contentSize" value={image.contentSize} onChange={(contentSize) => patch({ contentSize })} placeholder="Ex.: 240 KB" />
        <Field label="Data de envio" schemaProperty="uploadDate" value={image.uploadDate} onChange={(uploadDate) => patch({ uploadDate })} type="date" />
        <Field label="Data de publicação" schemaProperty="datePublished" value={image.datePublished} onChange={(datePublished) => patch({ datePublished })} type="date" />
        <Field label="Crédito" schemaProperty="creditText" value={image.creditText} onChange={(creditText) => patch({ creditText })} />
        <Field label="Aviso de direitos autorais" schemaProperty="copyrightNotice" value={image.copyrightNotice} onChange={(copyrightNotice) => patch({ copyrightNotice })} />
        <Field label="Licença" schemaProperty="license" value={image.license} onChange={(license) => patch({ license })} />
        <Field label="Página da licença" schemaProperty="acquireLicensePage" value={image.acquireLicensePage} onChange={(acquireLicensePage) => patch({ acquireLicensePage })} type="url" placeholder="https://…" />
        <Field label="Idioma" schemaProperty="inLanguage" value={image.inLanguage} onChange={(inLanguage) => patch({ inLanguage })} placeholder="pt-BR" />
      </FieldRow>
      <label className="check-field"><input type="checkbox" checked={image.representativeOfPage} onChange={(event) => patch({ representativeOfPage: event.target.checked })} /> <span>Imagem representativa da página (primaryImageOfPage)</span></label>
      <div className="media-card__footer"><span>ImageObject será gerado quando a URL for válida.</span><button type="button" className="button button--small button--danger" onClick={onDelete}>Remover imagem</button></div>
    </div>
  </details>;
}

function VideoCard({ video, index, versions, onChange, onDelete }: { video: VideoDraft; index: number; versions: PdpFormData['versions']; onChange(video: VideoDraft): void; onDelete(): void }) {
  const patch = (values: Partial<VideoDraft>) => onChange({ ...video, ...values });
  return <details className="media-card" open={index === 0}>
    <summary><span className="media-card__index">VID {String(index + 1).padStart(2, '0')}</span><span className="media-card__title">{video.name || video.contentUrl || video.embedUrl || 'Novo vídeo'}</span><span className="media-card__chevron">⌄</span></summary>
    <div className="media-card__body">
      <ScopeSelect value={video.scope} versions={versions} onChange={(scope) => patch({ scope })} />
      <FieldRow>
        <Field label="Nome do vídeo" schemaProperty="name" value={video.name} onChange={(name) => patch({ name })} placeholder="Título publicado" />
        <Field label="URL do arquivo de vídeo" schemaProperty="contentUrl" value={video.contentUrl} onChange={(contentUrl) => patch({ contentUrl })} type="url" placeholder="https://…/video.mp4" />
        <Field label="URL de incorporação" schemaProperty="embedUrl" value={video.embedUrl} onChange={(embedUrl) => patch({ embedUrl })} type="url" placeholder="https://…/embed/…" />
        <Field label="URL da miniatura" schemaProperty="thumbnailUrl" value={video.thumbnailUrl} onChange={(thumbnailUrl) => patch({ thumbnailUrl })} type="url" placeholder="https://…" />
        <Field label="Data de envio" schemaProperty="uploadDate" value={video.uploadDate} onChange={(uploadDate) => patch({ uploadDate })} type="date" />
        <Field label="Duração ISO 8601" schemaProperty="duration" value={video.duration} onChange={(duration) => patch({ duration })} placeholder="PT2M30S" />
        <Field label="Data de expiração" schemaProperty="expires" value={video.expires} onChange={(expires) => patch({ expires })} type="date" />
        <SelectField label="Adequado para família" schemaProperty="isFamilyFriendly" value={video.isFamilyFriendly === null ? '' : String(video.isFamilyFriendly)} onChange={(value) => patch({ isFamilyFriendly: value === '' ? null : value === 'true' })} options={[["true", 'Sim'], ["false", 'Não']]} />
        <Field label="Descrição" schemaProperty="description" value={video.description} onChange={(description) => patch({ description })} rows={3} wide />
        <Field label="Transcrição" schemaProperty="transcript" value={video.transcript} onChange={(transcript) => patch({ transcript })} rows={3} wide />
      </FieldRow>
      <div className="media-card__footer"><span>VideoObject exige nome, miniatura, data de envio e uma URL de vídeo válida.</span><button type="button" className="button button--small button--danger" onClick={onDelete}>Remover vídeo</button></div>
    </div>
  </details>;
}

export function MediaEditor({ data, onChange }: { data: PdpFormData; onChange(data: PdpFormData): void }) {
  const patchImage = (id: string, image: ImageDraft) => onChange({ ...data, images: data.images.map((item) => item.id === id ? image : item) });
  const patchVideo = (id: string, video: VideoDraft) => onChange({ ...data, videos: data.videos.map((item) => item.id === id ? video : item) });
  return <SectionCard id="media" number="05" title="Imagens e vídeos" description="Mídia múltipla, geral ou relacionada a uma versão; sem arquivos enviados ao servidor.">
    <div className="subheading-row"><Subheading title="Imagens e galerias" description="Cada URL única vira um ImageObject; entradas duplicadas são consolidadas." />
      <button type="button" className="button button--secondary button--small" onClick={() => onChange({ ...data, images: [...data.images, createBlankImage('page')] })}>＋ Adicionar imagem</button></div>
    {data.images.length ? <div className="media-list">{data.images.map((image, index) => <ImageCard key={image.id} image={image} index={index} versions={data.versions}
      onChange={(updated) => patchImage(image.id, updated)} onDelete={() => onChange({ ...data, images: data.images.filter((item) => item.id !== image.id) })} />)}</div>
      : <div className="empty-state empty-state--compact"><span className="empty-state__symbol">IMG</span><span>Nenhuma imagem cadastrada.</span></div>}

    <div className="subheading-row subheading-row--spaced"><Subheading title="Vídeos" description="VideoObject só será gerado quando os campos mínimos estiverem válidos." />
      <button type="button" className="button button--secondary button--small" onClick={() => onChange({ ...data, videos: [...data.videos, createBlankVideo('page')] })}>＋ Adicionar vídeo</button></div>
    {data.videos.length ? <div className="media-list">{data.videos.map((video, index) => <VideoCard key={video.id} video={video} index={index} versions={data.versions}
      onChange={(updated) => patchVideo(video.id, updated)} onDelete={() => onChange({ ...data, videos: data.videos.filter((item) => item.id !== video.id) })} />)}</div>
      : <div className="empty-state empty-state--compact"><span className="empty-state__symbol">VID</span><span>Nenhum vídeo cadastrado; o grafo não incluirá VideoObject.</span></div>}
    <div className="form-note"><span className="status-dot status-dot--info" />URLs são referenciadas no JSON-LD; os arquivos permanecem no seu CDN.</div>
  </SectionCard>;
}
