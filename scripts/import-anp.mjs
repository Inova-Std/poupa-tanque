/**
 * ANP Station Importer
 * Reads dados-cadastrais-revendedores-varejistas-combustiveis-automoveis.csv
 * and upserts all records into the GasStation table.
 *
 * run: node scripts/import-anp.mjs
 */

import { createReadStream } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createInterface } from "readline";
import { PrismaClient } from "@prisma/client";

const __dirname = dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

const CSV_PATH = resolve(
  __dirname,
  "../dados-cadastrais-revendedores-varejistas-combustiveis-automoveis.csv"
);

const BATCH_SIZE = 500; // upsert 500 at a time — safe for Postgres

function parseLine(line) {
  // Format: CODIGOISIMP;AUTORIZACAO;DATAPUBLICACAO;RAZAOSOCIAL;CNPJ;ENDERECO;COMPLEMENTO;BAIRRO;CEP;UF;MUNICIPIO;BANDEIRA;DATAVINCULACAO
  const parts = line.split(";");
  if (parts.length < 12) return null;

  const [, , , razaoSocial, cnpj, endereco, complemento, bairro, , uf, municipio, bandeira] = parts;

  // Build a readable address
  const addressParts = [endereco, complemento, bairro].filter(Boolean).map((s) => s.trim());
  const address = addressParts.join(", ") || endereco?.trim() || "Endereço não informado";

  return {
    name: razaoSocial?.trim() || "Posto sem nome",
    cnpj: cnpj?.replace(/\D/g, "").trim() || null, // digits only
    address,
    city: municipio?.trim() || null,
    state: uf?.trim() || null,
    brand: bandeira?.trim() || null,
    lat: null,
    lng: null,
  };
}

async function main() {
  console.log("📂 Reading CSV:", CSV_PATH);

  const rl = createInterface({
    input: createReadStream(CSV_PATH),
    crlfDelay: Infinity,
  });

  let batch = [];
  let total = 0;
  let errors = 0;
  let headerSkipped = false;

  for await (const line of rl) {
    if (!headerSkipped) {
      headerSkipped = true;
      continue;
    }

    const record = parseLine(line);
    if (!record || !record.cnpj) continue;

    batch.push(record);

    if (batch.length >= BATCH_SIZE) {
      const result = await flushBatch(batch);
      total += result.count;
      console.log(`✅ Imported ${total} stations so far...`);
      batch = [];
    }
  }

  // flush remainder
  if (batch.length > 0) {
    const result = await flushBatch(batch);
    total += result.count;
  }

  console.log(`\n🎉 Done! ${total} stations imported (${errors} skipped).`);
  await prisma.$disconnect();
}

async function flushBatch(records) {
  // Use createMany with skipDuplicates — fastest for bulk insert
  return prisma.gasStation.createMany({
    data: records,
    skipDuplicates: true, // skip if CNPJ already exists
  });
}

main().catch((e) => {
  console.error("❌ Import failed:", e);
  prisma.$disconnect();
  process.exit(1);
});
