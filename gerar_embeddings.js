/**
 * ============================================================================
 * Gerador da base de reconhecimento por foto (embeddings.json) - Di Solle
 * ============================================================================
 *
 * O QUE ESSE SCRIPT FAZ:
 * Para cada foto de produto (nomeada com o CÓDIGO do item, ex: "1401010004000.jpg"),
 * passa a imagem pelo mesmo modelo de IA (MobileNet v2) usado no tablet.html e
 * extrai um "vetor de características" (embedding) daquela imagem. Salva tudo
 * num único arquivo embeddings.json no formato:
 *   { "1401010004000": [0.12, -0.03, ...], "1401010005000": [...], ... }
 *
 * Isso é feito UMA VEZ (ou toda vez que você adicionar/trocar fotos de produtos).
 * O tablet.html depois só compara a foto tirada na hora com esses vetores já
 * prontos — não precisa rodar esse script no tablet nem gastar nada com isso.
 *
 * IMPORTANTE: a versão do MobileNet aqui (version: 2, alpha: 1.0) tem que ser
 * IDÊNTICA à usada no tablet.html, senão os vetores não são comparáveis.
 *
 * ============================================================================
 * COMO USAR:
 * ============================================================================
 * 1) Baixe todas as fotos da pasta do Drive para uma pasta local no computador,
 *    por exemplo "./fotos", mantendo o nome do arquivo = código do produto:
 *      fotos/1401010004000.jpg
 *      fotos/1401010005000.jpg
 *      fotos/...
 *    (Dica: no Drive, selecione a pasta > botão direito > Fazer Download.
 *     Ele baixa um .zip; só descompactar.)
 *
 * 2) Instale o Node.js (https://nodejs.org) se ainda não tiver.
 *
 * 3) Nessa pasta (gerar_embeddings/), rode no terminal:
 *      npm install
 *
 * 4) Rode o script apontando pra pasta de fotos:
 *      node gerar_embeddings.js ./fotos
 *
 *    Isso vai gerar o arquivo "embeddings.json" aqui do lado.
 *
 * 5) Copie o "embeddings.json" gerado para a MESMA pasta onde está o
 *    tablet.html (junto com manifest.json, sw.js, etc.) no seu hospedeiro
 *    (GitHub Pages, Google Sites, etc).
 *
 * 6) Sempre que cadastrar produto novo ou trocar foto, rode de novo (ele
 *    processa tudo, é rápido: ~2000 fotos leva poucos minutos num PC comum).
 * ============================================================================
 */

const fs = require("fs");
const path = require("path");
const tf = require("@tensorflow/tfjs-node");
const mobilenet = require("@tensorflow-models/mobilenet");

const EXTENSOES_VALIDAS = [".jpg", ".jpeg", ".png", ".webp"];

async function main() {
  const pastaFotos = process.argv[2];
  if (!pastaFotos) {
    console.error("Uso: node gerar_embeddings.js <pasta_com_fotos>");
    process.exit(1);
  }

  if (!fs.existsSync(pastaFotos)) {
    console.error(`Pasta não encontrada: ${pastaFotos}`);
    process.exit(1);
  }

  console.log("Carregando modelo MobileNet v2 (uma vez só)...");
  const model = await mobilenet.load({ version: 2, alpha: 1.0 });

  const arquivos = fs
    .readdirSync(pastaFotos)
    .filter((f) => EXTENSOES_VALIDAS.includes(path.extname(f).toLowerCase()));

  console.log(`Encontradas ${arquivos.length} fotos em "${pastaFotos}".`);

  const embeddings = {};
  let processados = 0;
  let comErro = 0;

  for (const arquivo of arquivos) {
    const codigo = path.basename(arquivo, path.extname(arquivo)).trim();
    const caminhoCompleto = path.join(pastaFotos, arquivo);

    try {
      const buffer = fs.readFileSync(caminhoCompleto);
      const imgTensor = tf.node.decodeImage(buffer, 3);
      const embeddingTensor = model.infer(imgTensor, true);
      const vetor = Array.from(await embeddingTensor.data()).map((v) =>
        Math.round(v * 100000) / 100000 // arredonda pra deixar o JSON menor
      );

      embeddings[codigo] = vetor;

      imgTensor.dispose();
      embeddingTensor.dispose();

      processados++;
      if (processados % 100 === 0) {
        console.log(`  ${processados}/${arquivos.length} processadas...`);
      }
    } catch (err) {
      comErro++;
      console.warn(`  ⚠️  Erro ao processar "${arquivo}": ${err.message}`);
    }
  }

  const saida = path.join(__dirname, "embeddings.json");
  fs.writeFileSync(saida, JSON.stringify(embeddings));

  const tamanhoMB = (fs.statSync(saida).size / (1024 * 1024)).toFixed(1);
  console.log("\n============================================");
  console.log(`✅ Concluído! ${processados} produtos processados (${comErro} com erro).`);
  console.log(`Arquivo gerado: ${saida} (${tamanhoMB} MB)`);
  console.log("Agora copie esse embeddings.json para a mesma pasta do tablet.html.");
  console.log("============================================");
}

main();
