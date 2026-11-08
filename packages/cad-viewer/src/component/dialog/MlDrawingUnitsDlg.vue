<template>
  <ml-base-dialog
    v-model:modelValue="visible"
    :title="t('dialog.drawingUnitsDlg.title')"
    :width="440"
    @open="handleOpen"
    @ok="handleOk"
    @cancel="handleCancel"
  >
    <div class="ml-drawing-units-dlg">
      <div class="ml-drawing-units-dlg__grid">
        <ml-fieldset-group
          :title="t('dialog.drawingUnitsDlg.lengthSection')"
          class="ml-drawing-units-dlg__pane"
        >
          <el-form label-position="top" class="ml-drawing-units-dlg__form">
            <el-form-item :label="t('dialog.drawingUnitsDlg.lengthType')">
              <el-select
                v-model="form.lunits"
                class="ml-drawing-units-dlg__control"
              >
                <el-option
                  v-for="opt in linearUnitOptions"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>
            </el-form-item>
            <el-form-item :label="t('dialog.drawingUnitsDlg.lengthPrecision')">
              <el-select
                v-model="form.luprec"
                class="ml-drawing-units-dlg__control"
              >
                <el-option
                  v-for="opt in lengthPrecisionOptions"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>
            </el-form-item>
          </el-form>
        </ml-fieldset-group>

        <ml-fieldset-group
          :title="t('dialog.drawingUnitsDlg.angleSection')"
          class="ml-drawing-units-dlg__pane"
        >
          <el-form label-position="top" class="ml-drawing-units-dlg__form">
            <el-form-item :label="t('dialog.drawingUnitsDlg.angleType')">
              <el-select
                v-model="form.aunits"
                class="ml-drawing-units-dlg__control"
              >
                <el-option
                  v-for="opt in angleUnitOptions"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>
            </el-form-item>
            <el-form-item :label="t('dialog.drawingUnitsDlg.anglePrecision')">
              <el-select
                v-model="form.auprec"
                class="ml-drawing-units-dlg__control"
              >
                <el-option
                  v-for="opt in anglePrecisionOptions"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-checkbox v-model="clockwiseChecked">{{
                t('dialog.drawingUnitsDlg.clockwise')
              }}</el-checkbox>
            </el-form-item>
          </el-form>
        </ml-fieldset-group>

        <ml-fieldset-group
          :title="t('dialog.drawingUnitsDlg.insertionSection')"
          class="ml-drawing-units-dlg__span-row"
        >
          <el-form label-position="top" class="ml-drawing-units-dlg__form">
            <el-form-item :label="t('dialog.drawingUnitsDlg.insertionUnits')">
              <el-select
                v-model="form.insunits"
                filterable
                class="ml-drawing-units-dlg__control"
              >
                <el-option
                  v-for="opt in insertionUnitOptions"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>
            </el-form-item>
          </el-form>
        </ml-fieldset-group>
      </div>
    </div>
  </ml-base-dialog>
</template>

<script setup lang="ts">
import {
  AcApAngleUnits,
  AcApLinearUnits,
  AcApSettingManager,
  AcApUnitsValue
} from '@mlightcad/cad-simple-viewer'
import {
  ElCheckbox,
  ElForm,
  ElFormItem,
  ElOption,
  ElSelect
} from 'element-plus'
import { computed, reactive } from 'vue'
import { useI18n } from 'vue-i18n'

import { drawingUnitPrecisionOptions } from '../../util/drawingUnitPrecision'
import MlBaseDialog from '../common/MlBaseDialog.vue'
import MlFieldsetGroup from '../common/MlFieldsetGroup.vue'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
}>()

const { t } = useI18n()

const visible = computed({
  get: () => props.modelValue,
  set: v => emit('update:modelValue', v)
})

const form = reactive({
  lunits: AcApLinearUnits.Decimal,
  luprec: 4,
  aunits: AcApAngleUnits.DecimalDegrees,
  auprec: 0,
  angdir: 0,
  insunits: AcApUnitsValue.Millimeters
})

/** ANGDIR: 1 = clockwise positive, 0 = counterclockwise (AutoCAD Clockwise checkbox). */
const clockwiseChecked = computed({
  get: () => form.angdir === 1,
  set: (v: boolean) => {
    form.angdir = v ? 1 : 0
  }
})

const lengthPrecisionOptions = computed(() =>
  drawingUnitPrecisionOptions(form.luprec)
)

const anglePrecisionOptions = computed(() =>
  drawingUnitPrecisionOptions(form.auprec)
)

const linearUnitOptions = computed(() => [
  {
    value: AcApLinearUnits.Scientific,
    label: t('dialog.drawingUnitsDlg.linear.scientific')
  },
  {
    value: AcApLinearUnits.Decimal,
    label: t('dialog.drawingUnitsDlg.linear.decimal')
  },
  {
    value: AcApLinearUnits.Engineering,
    label: t('dialog.drawingUnitsDlg.linear.engineering')
  },
  {
    value: AcApLinearUnits.Architectural,
    label: t('dialog.drawingUnitsDlg.linear.architectural')
  },
  {
    value: AcApLinearUnits.Fractional,
    label: t('dialog.drawingUnitsDlg.linear.fractional')
  },
  {
    value: AcApLinearUnits.WindowsDesktop,
    label: t('dialog.drawingUnitsDlg.linear.windowsDesktop')
  }
])

const angleUnitOptions = computed(() => [
  {
    value: AcApAngleUnits.DecimalDegrees,
    label: t('dialog.drawingUnitsDlg.angle.decimalDegrees')
  },
  {
    value: AcApAngleUnits.DegreesMinutesSeconds,
    label: t('dialog.drawingUnitsDlg.angle.dms')
  },
  {
    value: AcApAngleUnits.Gradians,
    label: t('dialog.drawingUnitsDlg.angle.gradians')
  },
  {
    value: AcApAngleUnits.Radians,
    label: t('dialog.drawingUnitsDlg.angle.radians')
  },
  {
    value: AcApAngleUnits.SurveyorsUnits,
    label: t('dialog.drawingUnitsDlg.angle.surveyors')
  }
])

const insertionUnitValues: AcApUnitsValue[] = [
  AcApUnitsValue.Undefined,
  AcApUnitsValue.Inches,
  AcApUnitsValue.Feet,
  AcApUnitsValue.Miles,
  AcApUnitsValue.Millimeters,
  AcApUnitsValue.Centimeters,
  AcApUnitsValue.Meters,
  AcApUnitsValue.Kilometers,
  AcApUnitsValue.Microinches,
  AcApUnitsValue.Mils,
  AcApUnitsValue.Yards,
  AcApUnitsValue.Angstroms,
  AcApUnitsValue.Nanometers,
  AcApUnitsValue.Microns,
  AcApUnitsValue.Decimeters,
  AcApUnitsValue.Dekameters,
  AcApUnitsValue.Hectometers,
  AcApUnitsValue.Gigameters,
  AcApUnitsValue.Astronomical,
  AcApUnitsValue.LightYears,
  AcApUnitsValue.Parsecs,
  AcApUnitsValue.USSurveyFeet,
  AcApUnitsValue.USSurveyInch,
  AcApUnitsValue.USSurveyYard,
  AcApUnitsValue.USSurveyMile
]

function insertionUnitLabel(value: AcApUnitsValue): string {
  switch (value) {
    case AcApUnitsValue.Undefined:
      return t('dialog.drawingUnitsDlg.insUnits._0')
    case AcApUnitsValue.Inches:
      return t('dialog.drawingUnitsDlg.insUnits._1')
    case AcApUnitsValue.Feet:
      return t('dialog.drawingUnitsDlg.insUnits._2')
    case AcApUnitsValue.Miles:
      return t('dialog.drawingUnitsDlg.insUnits._3')
    case AcApUnitsValue.Millimeters:
      return t('dialog.drawingUnitsDlg.insUnits._4')
    case AcApUnitsValue.Centimeters:
      return t('dialog.drawingUnitsDlg.insUnits._5')
    case AcApUnitsValue.Meters:
      return t('dialog.drawingUnitsDlg.insUnits._6')
    case AcApUnitsValue.Kilometers:
      return t('dialog.drawingUnitsDlg.insUnits._7')
    case AcApUnitsValue.Microinches:
      return t('dialog.drawingUnitsDlg.insUnits._8')
    case AcApUnitsValue.Mils:
      return t('dialog.drawingUnitsDlg.insUnits._9')
    case AcApUnitsValue.Yards:
      return t('dialog.drawingUnitsDlg.insUnits._10')
    case AcApUnitsValue.Angstroms:
      return t('dialog.drawingUnitsDlg.insUnits._11')
    case AcApUnitsValue.Nanometers:
      return t('dialog.drawingUnitsDlg.insUnits._12')
    case AcApUnitsValue.Microns:
      return t('dialog.drawingUnitsDlg.insUnits._13')
    case AcApUnitsValue.Decimeters:
      return t('dialog.drawingUnitsDlg.insUnits._14')
    case AcApUnitsValue.Dekameters:
      return t('dialog.drawingUnitsDlg.insUnits._15')
    case AcApUnitsValue.Hectometers:
      return t('dialog.drawingUnitsDlg.insUnits._16')
    case AcApUnitsValue.Gigameters:
      return t('dialog.drawingUnitsDlg.insUnits._17')
    case AcApUnitsValue.Astronomical:
      return t('dialog.drawingUnitsDlg.insUnits._18')
    case AcApUnitsValue.LightYears:
      return t('dialog.drawingUnitsDlg.insUnits._19')
    case AcApUnitsValue.Parsecs:
      return t('dialog.drawingUnitsDlg.insUnits._20')
    case AcApUnitsValue.USSurveyFeet:
      return t('dialog.drawingUnitsDlg.insUnits._21')
    case AcApUnitsValue.USSurveyInch:
      return t('dialog.drawingUnitsDlg.insUnits._22')
    case AcApUnitsValue.USSurveyYard:
      return t('dialog.drawingUnitsDlg.insUnits._23')
    case AcApUnitsValue.USSurveyMile:
      return t('dialog.drawingUnitsDlg.insUnits._24')
    default:
      return t('dialog.drawingUnitsDlg.insUnits._0')
  }
}

const insertionUnitOptions = computed(() =>
  insertionUnitValues.map(value => ({
    value,
    label: insertionUnitLabel(value)
  }))
)

const VALID_LUNITS = new Set<number>([
  AcApLinearUnits.Scientific,
  AcApLinearUnits.Decimal,
  AcApLinearUnits.Engineering,
  AcApLinearUnits.Architectural,
  AcApLinearUnits.Fractional,
  AcApLinearUnits.WindowsDesktop
])

function clampInt(value: number, min: number, max: number) {
  const n = Math.trunc(Number(value))
  if (Number.isNaN(n)) return min
  return Math.min(max, Math.max(min, n))
}

function normalizeLunits(raw: number) {
  return VALID_LUNITS.has(raw) ? raw : AcApLinearUnits.Decimal
}

function normalizeAunits(raw: number) {
  return clampInt(raw, 0, 4)
}

function readFormFromSettings() {
  const settings = AcApSettingManager.instance
  form.lunits = normalizeLunits(settings.get('linearUnits'))
  form.luprec = clampInt(settings.get('linearPrecision'), 0, 8)
  form.aunits = normalizeAunits(settings.get('angularUnits'))
  form.auprec = clampInt(settings.get('angularPrecision'), 0, 8)
  form.angdir = settings.get('angleDirection') === 1 ? 1 : 0
  const ins = clampInt(settings.get('insertionUnits'), 0, AcApUnitsValue.Max)
  form.insunits = ins as AcApUnitsValue
}

function handleOpen() {
  readFormFromSettings()
}

function handleCancel() {
  readFormFromSettings()
}

function handleOk() {
  const lunits = normalizeLunits(form.lunits)
  const luprec = clampInt(form.luprec, 0, 8)
  const aunits = normalizeAunits(form.aunits)
  const auprec = clampInt(form.auprec, 0, 8)
  const angdir = form.angdir === 1 ? 1 : 0
  const insunits = clampInt(form.insunits, 0, AcApUnitsValue.Max)

  AcApSettingManager.instance.apply({
    linearUnits: lunits,
    linearPrecision: luprec,
    angularUnits: aunits,
    angularPrecision: auprec,
    angleDirection: angdir,
    insertionUnits: insunits
  })
}
</script>

<style scoped>
.ml-drawing-units-dlg__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  column-gap: 16px;
  row-gap: 12px;
  align-items: stretch;
}

.ml-drawing-units-dlg__pane {
  min-width: 0;
  min-height: 0;
  height: 100%;
}

.ml-drawing-units-dlg__span-row {
  grid-column: 1 / -1;
  min-width: 0;
  min-height: 0;
}

.ml-drawing-units-dlg__form :deep(.el-form-item) {
  margin-bottom: 8px;
}

.ml-drawing-units-dlg__form :deep(.el-form-item:last-child) {
  margin-bottom: 0;
}

.ml-drawing-units-dlg__control {
  width: 100%;
  max-width: 100%;
}
</style>
