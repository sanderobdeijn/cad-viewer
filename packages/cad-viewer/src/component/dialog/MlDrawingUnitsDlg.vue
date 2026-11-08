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
  ApplicationAngleUnits,
  ApplicationLinearUnits,
  ApplicationSettingManager,
  ApplicationUnitsValue
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
  lunits: ApplicationLinearUnits.Decimal,
  luprec: 4,
  aunits: ApplicationAngleUnits.DecimalDegrees,
  auprec: 0,
  angdir: 0,
  insunits: ApplicationUnitsValue.Millimeters
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
    value: ApplicationLinearUnits.Scientific,
    label: t('dialog.drawingUnitsDlg.linear.scientific')
  },
  {
    value: ApplicationLinearUnits.Decimal,
    label: t('dialog.drawingUnitsDlg.linear.decimal')
  },
  {
    value: ApplicationLinearUnits.Engineering,
    label: t('dialog.drawingUnitsDlg.linear.engineering')
  },
  {
    value: ApplicationLinearUnits.Architectural,
    label: t('dialog.drawingUnitsDlg.linear.architectural')
  },
  {
    value: ApplicationLinearUnits.Fractional,
    label: t('dialog.drawingUnitsDlg.linear.fractional')
  },
  {
    value: ApplicationLinearUnits.WindowsDesktop,
    label: t('dialog.drawingUnitsDlg.linear.windowsDesktop')
  }
])

const angleUnitOptions = computed(() => [
  {
    value: ApplicationAngleUnits.DecimalDegrees,
    label: t('dialog.drawingUnitsDlg.angle.decimalDegrees')
  },
  {
    value: ApplicationAngleUnits.DegreesMinutesSeconds,
    label: t('dialog.drawingUnitsDlg.angle.dms')
  },
  {
    value: ApplicationAngleUnits.Gradians,
    label: t('dialog.drawingUnitsDlg.angle.gradians')
  },
  {
    value: ApplicationAngleUnits.Radians,
    label: t('dialog.drawingUnitsDlg.angle.radians')
  },
  {
    value: ApplicationAngleUnits.SurveyorsUnits,
    label: t('dialog.drawingUnitsDlg.angle.surveyors')
  }
])

const insertionUnitValues: ApplicationUnitsValue[] = [
  ApplicationUnitsValue.Undefined,
  ApplicationUnitsValue.Inches,
  ApplicationUnitsValue.Feet,
  ApplicationUnitsValue.Miles,
  ApplicationUnitsValue.Millimeters,
  ApplicationUnitsValue.Centimeters,
  ApplicationUnitsValue.Meters,
  ApplicationUnitsValue.Kilometers,
  ApplicationUnitsValue.Microinches,
  ApplicationUnitsValue.Mils,
  ApplicationUnitsValue.Yards,
  ApplicationUnitsValue.Angstroms,
  ApplicationUnitsValue.Nanometers,
  ApplicationUnitsValue.Microns,
  ApplicationUnitsValue.Decimeters,
  ApplicationUnitsValue.Dekameters,
  ApplicationUnitsValue.Hectometers,
  ApplicationUnitsValue.Gigameters,
  ApplicationUnitsValue.Astronomical,
  ApplicationUnitsValue.LightYears,
  ApplicationUnitsValue.Parsecs,
  ApplicationUnitsValue.USSurveyFeet,
  ApplicationUnitsValue.USSurveyInch,
  ApplicationUnitsValue.USSurveyYard,
  ApplicationUnitsValue.USSurveyMile
]

function insertionUnitLabel(value: ApplicationUnitsValue): string {
  switch (value) {
    case ApplicationUnitsValue.Undefined:
      return t('dialog.drawingUnitsDlg.insUnits._0')
    case ApplicationUnitsValue.Inches:
      return t('dialog.drawingUnitsDlg.insUnits._1')
    case ApplicationUnitsValue.Feet:
      return t('dialog.drawingUnitsDlg.insUnits._2')
    case ApplicationUnitsValue.Miles:
      return t('dialog.drawingUnitsDlg.insUnits._3')
    case ApplicationUnitsValue.Millimeters:
      return t('dialog.drawingUnitsDlg.insUnits._4')
    case ApplicationUnitsValue.Centimeters:
      return t('dialog.drawingUnitsDlg.insUnits._5')
    case ApplicationUnitsValue.Meters:
      return t('dialog.drawingUnitsDlg.insUnits._6')
    case ApplicationUnitsValue.Kilometers:
      return t('dialog.drawingUnitsDlg.insUnits._7')
    case ApplicationUnitsValue.Microinches:
      return t('dialog.drawingUnitsDlg.insUnits._8')
    case ApplicationUnitsValue.Mils:
      return t('dialog.drawingUnitsDlg.insUnits._9')
    case ApplicationUnitsValue.Yards:
      return t('dialog.drawingUnitsDlg.insUnits._10')
    case ApplicationUnitsValue.Angstroms:
      return t('dialog.drawingUnitsDlg.insUnits._11')
    case ApplicationUnitsValue.Nanometers:
      return t('dialog.drawingUnitsDlg.insUnits._12')
    case ApplicationUnitsValue.Microns:
      return t('dialog.drawingUnitsDlg.insUnits._13')
    case ApplicationUnitsValue.Decimeters:
      return t('dialog.drawingUnitsDlg.insUnits._14')
    case ApplicationUnitsValue.Dekameters:
      return t('dialog.drawingUnitsDlg.insUnits._15')
    case ApplicationUnitsValue.Hectometers:
      return t('dialog.drawingUnitsDlg.insUnits._16')
    case ApplicationUnitsValue.Gigameters:
      return t('dialog.drawingUnitsDlg.insUnits._17')
    case ApplicationUnitsValue.Astronomical:
      return t('dialog.drawingUnitsDlg.insUnits._18')
    case ApplicationUnitsValue.LightYears:
      return t('dialog.drawingUnitsDlg.insUnits._19')
    case ApplicationUnitsValue.Parsecs:
      return t('dialog.drawingUnitsDlg.insUnits._20')
    case ApplicationUnitsValue.USSurveyFeet:
      return t('dialog.drawingUnitsDlg.insUnits._21')
    case ApplicationUnitsValue.USSurveyInch:
      return t('dialog.drawingUnitsDlg.insUnits._22')
    case ApplicationUnitsValue.USSurveyYard:
      return t('dialog.drawingUnitsDlg.insUnits._23')
    case ApplicationUnitsValue.USSurveyMile:
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
  ApplicationLinearUnits.Scientific,
  ApplicationLinearUnits.Decimal,
  ApplicationLinearUnits.Engineering,
  ApplicationLinearUnits.Architectural,
  ApplicationLinearUnits.Fractional,
  ApplicationLinearUnits.WindowsDesktop
])

function clampInt(value: number, min: number, max: number) {
  const n = Math.trunc(Number(value))
  if (Number.isNaN(n)) return min
  return Math.min(max, Math.max(min, n))
}

function normalizeLunits(raw: number) {
  return VALID_LUNITS.has(raw) ? raw : ApplicationLinearUnits.Decimal
}

function normalizeAunits(raw: number) {
  return clampInt(raw, 0, 4)
}

function readFormFromSettings() {
  const settings = ApplicationSettingManager.instance
  form.lunits = normalizeLunits(settings.get('linearUnits'))
  form.luprec = clampInt(settings.get('linearPrecision'), 0, 8)
  form.aunits = normalizeAunits(settings.get('angularUnits'))
  form.auprec = clampInt(settings.get('angularPrecision'), 0, 8)
  form.angdir = settings.get('angleDirection') === 1 ? 1 : 0
  const ins = clampInt(settings.get('insertionUnits'), 0, ApplicationUnitsValue.Max)
  form.insunits = ins as ApplicationUnitsValue
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
  const insunits = clampInt(form.insunits, 0, ApplicationUnitsValue.Max)

  ApplicationSettingManager.instance.apply({
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
