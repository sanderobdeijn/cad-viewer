import enDialog from '../en/dialog'

export default {
  ...enDialog,

  baseDialog: {
    ...enDialog.baseDialog,
    ok: 'موافق',
    cancel: 'إلغاء',
    apply: 'تطبيق'
  },

  pointStyleDlg: {
    ...enDialog.pointStyleDlg,
    title: 'نمط النقطة',
    pointSize: 'حجم النقطة:'
  },

  drawingUnitsDlg: {
    ...enDialog.drawingUnitsDlg,

    title: 'وحدات الرسم',

    lengthSection: 'الطول',
    lengthType: 'النوع:',
    lengthPrecision: 'الدقة:',
    lengthUnit: 'الوحدة:',
    lengthUnitFollowDrawing: 'اتبع الرسم',

    angleSection: 'الزاوية',
    angleType: 'النوع:',
    anglePrecision: 'الدقة:',

    clockwise: 'مع عقارب الساعة',

    insertionSection: 'مقياس الإدراج',
    insertionUnits: 'وحدات قياس المحتوى المدرج:',

    linear: {
      ...enDialog.drawingUnitsDlg.linear,
      scientific: 'علمي',
      decimal: 'عشري',
      engineering: 'هندسي',
      architectural: 'معماري',
      fractional: 'كسري',
      windowsDesktop: 'سطح مكتب Windows'
    },

    angle: {
      ...enDialog.drawingUnitsDlg.angle,
      decimalDegrees: 'درجات عشرية',
      dms: 'درجة/دقيقة/ثانية',
      gradians: 'غراديان',
      radians: 'راديان',
      surveyors: 'وحدات المساحة'
    },

    insUnits: {
      ...enDialog.drawingUnitsDlg.insUnits,
      _0: 'بدون وحدة',
      _1: 'بوصة',
      _2: 'قدم',
      _3: 'ميل',
      _4: 'ملليمتر',
      _5: 'سنتيمتر',
      _6: 'متر',
      _7: 'كيلومتر',
      _8: 'ميكروبوصة',
      _9: 'ميلز',
      _10: 'ياردة',
      _11: 'أنغستروم',
      _12: 'نانومتر',
      _13: 'ميكرون',
      _14: 'ديسيمتر',
      _15: 'ديكامتر',
      _16: 'هكتومتر',
      _17: 'غيغامتر',
      _18: 'وحدة فلكية',
      _19: 'سنة ضوئية',
      _20: 'فرسخ فلكي',
      _21: 'قدم مساحية أمريكية',
      _22: 'بوصة مساحية أمريكية',
      _23: 'ياردة مساحية أمريكية',
      _24: 'ميل مساحي أمريكي'
    }
  },

  colorPickerDlg: {
    ...enDialog.colorPickerDlg,
    title: 'اختيار اللون',
    aciTabTitle: 'فهرس الألوان',
    rgbTabTitle: 'لون حقيقي'
  },

  quickSelectDlg: {
    ...enDialog.quickSelectDlg,

    title: 'تحديد سريع',
    applyTo: 'تطبيق على',
    applyToEntireDrawing: 'الرسم بالكامل',
    applyToCurrentSelection: 'التحديد الحالي',

    objectType: 'نوع العنصر',
    allObjectTypes: 'متعدد',
    property: 'الخاصية',
    operator: 'المعامل',
    value: 'القيمة',

    howToApply: 'طريقة التطبيق',

    propObjectType: 'نوع العنصر',
    propHandle: 'المعرف (Handle)',
    handleValuePlaceholder: 'أدخل معرف العنصر (Handle)',
    propColor: 'اللون',
    propLineType: 'نوع الخط',
    propLineWeight: 'سُمك الخط',

    opEquals: 'يساوي',
    opNotEquals: 'لا يساوي',
    opGreaterThan: 'أكبر من',
    opGreaterThanOrEqual: 'أكبر من أو يساوي',
    opLessThan: 'أقل من',
    opLessThanOrEqual: 'أقل من أو يساوي',

    modeSet: 'تضمين في مجموعة تحديد جديدة',
    modeAdd: 'إضافة إلى مجموعة التحديد الحالية',
    modeRemove: 'استبعاد من مجموعة التحديد الحالية',

    previewResult: 'العناصر المطابقة: {count} / إجمالي العناصر: {total}',

    valueRequired: 'يرجى تحديد قيمة للتصفية',

    selectionResult: 'تم العثور على {count} عنصر وتطبيقها على التحديد'
  },

  textStyleDlg: {
    ...enDialog.textStyleDlg,

    title: 'نمط النص',
    currentStyle: 'نمط النص الحالي: {name}',
    styles: 'الأنماط',

    fontSection: 'الخط',
    fontName: 'اسم الخط:',
    fontStyle: 'نمط الخط:',
    useBigFont: 'استخدام الخط الكبير',
    bigFontName: 'الخط الكبير:',

    sizeSection: 'الحجم',
    textHeight: 'الارتفاع:',

    effectsSection: 'التأثيرات',
    upsideDown: 'مقلوب رأسيًا',
    backwards: 'معكوس',
    vertical: 'رأسي',

    widthFactor: 'معامل العرض:',
    obliqueAngle: 'زاوية الميل:',

    setCurrent: 'تعيين كحالي',
    new: 'جديد...',
    delete: 'حذف',

    newTitle: 'نمط نص جديد',
    newStyleName: 'اسم النمط:',
    newPrompt: 'أدخل اسم نمط النص الجديد:',
    newNameRequired: 'يرجى إدخال اسم لنمط النص.',

    deleteTitle: 'حذف نمط النص',
    deleteConfirm: 'حذف نمط النص "{name}"؟',

    invalidName: 'لا يمكن أن يحتوي اسم النمط على ;=<>`\\/,',
    duplicateName: 'يوجد نمط نص بهذا الاسم بالفعل.',

    created: 'تم إنشاء نمط النص "{name}".',
    deleted: 'تم حذف نمط النص "{name}".',
    setCurrentDone: 'تم تعيين نمط النص الحالي إلى "{name}".'
  }
}
