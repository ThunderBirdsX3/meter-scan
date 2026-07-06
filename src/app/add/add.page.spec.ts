import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormsModule, NgForm } from '@angular/forms';
import { ToastController } from '@ionic/angular';

import { AddPage } from './add.page';
import { CameraService } from '../services/camera.service';
import { MeterOnnxService } from '../services/meter-onnx.service';
import { FuelDataService } from '../services/fuel-data.service';
import { Trip, Vehicle } from '../models/fuel-entry.model';

// Plan: 2026-07-03-2208-vehicle-fuel-autofill — Test Plan unit groups a-d + manual-change reset
describe('AddPage — vehicle → fuel-type auto-fill (not force)', () => {
  let dataSpy: jasmine.SpyObj<FuelDataService>;

  const vehicleWithDefault: Vehicle = {
    id: 1, name: 'Civic', licensePlate: 'กก 1111', fuelTypeId: 7, createdAt: new Date('2026-07-01'),
  };
  const vehicleWithoutDefault: Vehicle = {
    id: 2, name: 'Jazz', licensePlate: 'กก 2222', createdAt: new Date('2026-07-01'),
  };

  function setup(): AddPage {
    dataSpy = jasmine.createSpyObj<FuelDataService>('FuelDataService', [
      'getVehicles', 'getTrips', 'getBrands', 'getFuelTypes', 'getBrandFuels', 'addEntry',
    ]);
    dataSpy.getVehicles.and.resolveTo([vehicleWithDefault, vehicleWithoutDefault]);
    dataSpy.getTrips.and.resolveTo([]);
    dataSpy.getBrands.and.resolveTo([]);
    dataSpy.getFuelTypes.and.resolveTo([]);
    dataSpy.getBrandFuels.and.resolveTo([]);

    TestBed.configureTestingModule({
      declarations: [AddPage],
      imports: [FormsModule],   // template uses #entryForm="ngForm" + [(ngModel)] → NG0301 without this
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        { provide: CameraService, useValue: jasmine.createSpyObj('CameraService', ['takePhoto', 'pickFromGallery']) },
        { provide: MeterOnnxService, useValue: jasmine.createSpyObj('MeterOnnxService', ['warmUp', 'readField']) },
        { provide: FuelDataService, useValue: dataSpy },
        { provide: ToastController, useValue: jasmine.createSpyObj('ToastController', ['create']) },
      ],
    });

    const fixture = TestBed.createComponent(AddPage);
    const page = fixture.componentInstance;
    // Bypass loadPickerData()/ngOnInit — inject picker data directly to isolate the method under test.
    page.vehicles = [vehicleWithDefault, vehicleWithoutDefault];
    return page;
  }

  it('(a) fuelTypeId empty + vehicle has default → auto-fills and marks fuelTypeAutoFilled=true', () => {
    const page = setup();
    page.draft = { vehicleId: 1 };
    page.fuelTypeAutoFilled = false;

    page.onVehicleChange();

    expect(page.draft.fuelTypeId).toBe(7);
    expect(page.fuelTypeAutoFilled).toBeTrue();
  });

  it('(b) fuelTypeId already has a manual value (fuelTypeAutoFilled=false) → does NOT overwrite', () => {
    const page = setup();
    page.draft = { vehicleId: 1, fuelTypeId: 99 };
    page.fuelTypeAutoFilled = false;

    page.onVehicleChange();

    expect(page.draft.fuelTypeId).toBe(99);
    expect(page.fuelTypeAutoFilled).toBeFalse();
  });

  it('(c) current value came from a prior auto-fill, switching vehicle → updates to new vehicle default', () => {
    const page = setup();
    page.draft = { vehicleId: 1, fuelTypeId: 3 }; // stale auto value from a previously-selected vehicle
    page.fuelTypeAutoFilled = true;

    page.onVehicleChange();

    expect(page.draft.fuelTypeId).toBe(7);
    expect(page.fuelTypeAutoFilled).toBeTrue();
  });

  it('(d) vehicle has no default → keeps existing fuelTypeId untouched (no clear)', () => {
    const page = setup();
    page.draft = { vehicleId: 2, fuelTypeId: 5 };
    page.fuelTypeAutoFilled = false;

    page.onVehicleChange();

    expect(page.draft.fuelTypeId).toBe(5);
    expect(page.fuelTypeAutoFilled).toBeFalse();
  });

  it('onFuelTypeManualChange() sets fuelTypeAutoFilled=false so a later vehicle switch will not overwrite it', () => {
    const page = setup();
    page.fuelTypeAutoFilled = true;

    page.onFuelTypeManualChange();

    expect(page.fuelTypeAutoFilled).toBeFalse();
  });

  // Plan: 2026-07-04-1029-brand-logo-fuel-color-assets — brand_fuel join picker filter (step 8)
  describe('fuel picker — canonical catalog vs. brand-filtered offers (schema v2)', () => {
    it('no brand selected → fuelPickerOptions falls back to the full canonical catalog', () => {
      const page = setup();
      page.fuelTypes = [
        { id: 1, code: 'G95', label: 'แก๊สโซฮอล์ 95', sortOrder: 20 },
        { id: 2, code: 'DIESEL', label: 'ดีเซล', sortOrder: 70 },
      ];
      page.draft = { brandId: undefined };

      expect(page.fuelPickerOptions).toEqual([
        { id: 1, label: 'แก๊สโซฮอล์ 95' },
        { id: 2, label: 'ดีเซล' },
      ]);
    });

    it('onBrandChange() loads that brand\'s offers via getBrandFuels() — picker filters to them, label = marketingName || label', async () => {
      const page = setup();
      dataSpy.getBrandFuels.and.resolveTo([
        { brandId: 10, fuelTypeId: 2, code: 'DIESEL', label: 'ดีเซล', color: '#0072BB' },
        { brandId: 10, fuelTypeId: 3, code: 'DIESEL+', label: 'ดีเซลพรีเมียม', color: '#012872', marketingName: 'ไฮพรีเมียมดีเซล' },
      ]);
      page.draft = { brandId: 10 };

      await page.onBrandChange();

      expect(dataSpy.getBrandFuels).toHaveBeenCalledWith(10);
      expect(page.fuelPickerOptions).toEqual([
        { id: 2, label: 'ดีเซล', color: '#0072BB' },
        { id: 3, label: 'ไฮพรีเมียมดีเซล', color: '#012872' },
      ]);
    });

    it('onBrandChange() with no brand selected clears brandFuelOptions without calling getBrandFuels()', async () => {
      const page = setup();
      page.brandFuelOptions = [{ brandId: 10, fuelTypeId: 2, code: 'DIESEL', label: 'ดีเซล', color: '#0072BB' }];
      page.draft = { brandId: undefined };

      await page.onBrandChange();

      expect(dataSpy.getBrandFuels).not.toHaveBeenCalled();
      expect(page.brandFuelOptions).toEqual([]);
    });

    it('selectedFuelColor resolves the currently-picked offering\'s color (supplemental — plan DS Compliance)', async () => {
      const page = setup();
      dataSpy.getBrandFuels.and.resolveTo([
        { brandId: 10, fuelTypeId: 2, code: 'DIESEL', label: 'ดีเซล', color: '#0072BB' },
      ]);
      page.draft = { brandId: 10, fuelTypeId: 2 };

      await page.onBrandChange();

      expect(page.selectedFuelColor).toBe('#0072BB');
    });

    it('selectedFuelColor is undefined when the picked fuel has no color info (e.g. catalog-only, no brand)', () => {
      const page = setup();
      page.fuelTypes = [{ id: 5, code: 'LPG', label: 'LPG', sortOrder: 110 }];
      page.draft = { brandId: undefined, fuelTypeId: 5 };

      expect(page.selectedFuelColor).toBeUndefined();
    });
  });
});

// Plan: 2026-07-06-0930-add-page-trip-vehicle-autofill-fab-save — Test Plan TC-01/TC-02
describe('AddPage — trip → vehicle autofill (onTripChange)', () => {
  const vehicleWithDefault: Vehicle = {
    id: 5, name: 'Civic', licensePlate: 'กก 1111', fuelTypeId: 7, createdAt: new Date('2026-07-01'),
  };
  const tripWithVehicle: Trip = {
    id: 1, name: 'ทริป A', vehicleId: 5, isActive: true, createdAt: new Date('2026-07-01'),
  };
  const tripNoVehicle: Trip = {
    id: 2, name: 'ทริป B', isActive: true, createdAt: new Date('2026-07-01'),
  };

  function setup(): AddPage {
    const dataSpy = jasmine.createSpyObj<FuelDataService>('FuelDataService', [
      'getVehicles', 'getTrips', 'getBrands', 'getFuelTypes', 'getBrandFuels', 'addEntry',
    ]);
    dataSpy.getVehicles.and.resolveTo([vehicleWithDefault]);
    dataSpy.getTrips.and.resolveTo([tripWithVehicle, tripNoVehicle]);
    dataSpy.getBrands.and.resolveTo([]);
    dataSpy.getFuelTypes.and.resolveTo([]);
    dataSpy.getBrandFuels.and.resolveTo([]);

    TestBed.configureTestingModule({
      declarations: [AddPage],
      imports: [FormsModule],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        { provide: CameraService, useValue: jasmine.createSpyObj('CameraService', ['takePhoto', 'pickFromGallery']) },
        { provide: MeterOnnxService, useValue: jasmine.createSpyObj('MeterOnnxService', ['warmUp', 'readField']) },
        { provide: FuelDataService, useValue: dataSpy },
        { provide: ToastController, useValue: jasmine.createSpyObj('ToastController', ['create']) },
      ],
    });

    const fixture = TestBed.createComponent(AddPage);
    const page = fixture.componentInstance;
    // Bypass loadPickerData() — inject picker data directly (same pattern as the suite above).
    page.vehicles = [vehicleWithDefault];
    page.trips = [tripWithVehicle, tripNoVehicle];
    return page;
  }

  it('TC-01: selecting a trip with a vehicleId sets draft.vehicleId AND cascades fuel-type autofill', () => {
    const page = setup();
    page.draft = { tripId: 1 };
    page.fuelTypeAutoFilled = false;

    page.onTripChange();

    expect(page.draft.vehicleId).toBe(5);
    expect(page.draft.fuelTypeId).toBe(7); // cascaded via onVehicleChange()
    expect(page.fuelTypeAutoFilled).toBeTrue();
  });

  it('TC-02 (regression): selecting a trip with NO vehicleId does not clear a manually-picked vehicle', () => {
    const page = setup();
    page.draft = { tripId: 2, vehicleId: 9 };

    page.onTripChange();

    expect(page.draft.vehicleId).toBe(9);
  });

  it('TC-02b (regression): selecting "— ไม่ระบุ —" (tripId="") does not clear a manually-picked vehicle', () => {
    const page = setup();
    page.draft = { tripId: '' as unknown as number, vehicleId: 9 };

    page.onTripChange();

    expect(page.draft.vehicleId).toBe(9);
  });
});

// Plan: 2026-07-06-0930-add-page-trip-vehicle-autofill-fab-save — Test Plan TC-03
describe('AddPage — FAB↔inline save toggle (onScroll / updateAtBottom)', () => {
  function setup(): AddPage {
    const dataSpy = jasmine.createSpyObj<FuelDataService>('FuelDataService', [
      'getVehicles', 'getTrips', 'getBrands', 'getFuelTypes', 'getBrandFuels', 'addEntry',
    ]);
    dataSpy.getVehicles.and.resolveTo([]);
    dataSpy.getTrips.and.resolveTo([]);
    dataSpy.getBrands.and.resolveTo([]);
    dataSpy.getFuelTypes.and.resolveTo([]);
    dataSpy.getBrandFuels.and.resolveTo([]);

    TestBed.configureTestingModule({
      declarations: [AddPage],
      imports: [FormsModule],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        { provide: CameraService, useValue: jasmine.createSpyObj('CameraService', ['takePhoto', 'pickFromGallery']) },
        { provide: MeterOnnxService, useValue: jasmine.createSpyObj('MeterOnnxService', ['warmUp', 'readField']) },
        { provide: FuelDataService, useValue: dataSpy },
        { provide: ToastController, useValue: jasmine.createSpyObj('ToastController', ['create']) },
      ],
    });

    return TestBed.createComponent(AddPage).componentInstance;
  }

  // page.content (@ViewChild(IonContent)) is not populated without a full ionic-runtime render —
  // stub it directly with the same shape ion-content's real getScrollElement() resolves to.
  function mockScrollElement(page: AddPage, el: { scrollTop: number; clientHeight: number; scrollHeight: number }) {
    (page as unknown as { content: { getScrollElement(): Promise<typeof el> } }).content = {
      getScrollElement: () => Promise.resolve(el),
    };
  }

  it('TC-03a: mid-scroll (not yet at bottom) → atBottom becomes false (template shows FAB, hides inline)', async () => {
    const page = setup();
    page.atBottom = true;
    mockScrollElement(page, { scrollTop: 100, clientHeight: 600, scrollHeight: 2000 });

    await page.onScroll({ detail: { scrollTop: 100 } } as unknown as CustomEvent);

    expect(page.atBottom).toBeFalse();
  });

  it('TC-03b: scrolled to the bottom → atBottom becomes true (template shows inline, hides FAB)', async () => {
    const page = setup();
    page.atBottom = false;
    mockScrollElement(page, { scrollTop: 1390, clientHeight: 600, scrollHeight: 2000 }); // 1390+600=1990 >= 2000-24

    await page.onScroll({ detail: { scrollTop: 1390 } } as unknown as CustomEvent);

    expect(page.atBottom).toBeTrue();
  });

  it('TC-03c: boundary threshold — just short of the 24px allowance stays NOT at bottom', async () => {
    const page = setup();
    page.atBottom = true;
    mockScrollElement(page, { scrollTop: 1350, clientHeight: 600, scrollHeight: 2000 }); // 1350+600=1950 < 1976

    await page.onScroll({ detail: { scrollTop: 1350 } } as unknown as CustomEvent);

    expect(page.atBottom).toBeFalse();
  });

  it('ionViewDidEnter() recomputes atBottom from the live scroll element (plan step 4 — initial state)', async () => {
    const page = setup();
    page.atBottom = true;
    mockScrollElement(page, { scrollTop: 0, clientHeight: 400, scrollHeight: 1200 }); // short viewport, not at bottom

    await page.ionViewDidEnter();

    expect(page.atBottom).toBeFalse();
  });
});

// Fix 2026-07-06-1033 — Test Cases TC-01/TC-02/TC-03 (template — inline always in DOM,
// FAB hidden via CSS class not *ngIf, save-outline icon on both buttons)
describe('AddPage — template: submit-section always in DOM, FAB class-toggle, save-outline icon', () => {
  function setupFixture() {
    const dataSpy = jasmine.createSpyObj<FuelDataService>('FuelDataService', [
      'getVehicles', 'getTrips', 'getBrands', 'getFuelTypes', 'getBrandFuels', 'addEntry',
    ]);
    dataSpy.getVehicles.and.resolveTo([]);
    dataSpy.getTrips.and.resolveTo([]);
    dataSpy.getBrands.and.resolveTo([]);
    dataSpy.getFuelTypes.and.resolveTo([]);
    dataSpy.getBrandFuels.and.resolveTo([]);

    TestBed.configureTestingModule({
      declarations: [AddPage],
      imports: [FormsModule],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        { provide: CameraService, useValue: jasmine.createSpyObj('CameraService', ['takePhoto', 'pickFromGallery']) },
        { provide: MeterOnnxService, useValue: jasmine.createSpyObj('MeterOnnxService', ['warmUp', 'readField']) },
        { provide: FuelDataService, useValue: dataSpy },
        { provide: ToastController, useValue: jasmine.createSpyObj('ToastController', ['create']) },
      ],
    });

    const fixture = TestBed.createComponent(AddPage);
    return fixture;
  }

  it('TC-01: .submit-section (inline save button) is present in the DOM when atBottom=true', () => {
    const fixture = setupFixture();
    fixture.componentInstance.atBottom = true;
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.submit-section')).toBeTruthy();
  });

  it('TC-01: .submit-section (inline save button) is STILL present in the DOM when atBottom=false (no *ngIf removal)', () => {
    const fixture = setupFixture();
    fixture.componentInstance.atBottom = false;
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.submit-section')).toBeTruthy();
  });

  it('TC-02: FAB (ion-fab) has class "is-hidden" when atBottom=true', () => {
    const fixture = setupFixture();
    fixture.componentInstance.atBottom = true;
    fixture.detectChanges();

    const fab = fixture.nativeElement.querySelector('ion-fab');
    expect(fab).toBeTruthy();
    expect(fab.classList.contains('is-hidden')).toBeTrue();
  });

  it('TC-02: FAB (ion-fab) does NOT have class "is-hidden" when atBottom=false', () => {
    const fixture = setupFixture();
    fixture.componentInstance.atBottom = false;
    fixture.detectChanges();

    const fab = fixture.nativeElement.querySelector('ion-fab');
    expect(fab).toBeTruthy();
    expect(fab.classList.contains('is-hidden')).toBeFalse();
  });

  it('TC-03: both the inline save button and the FAB render ion-icon[name="save-outline"] (not checkmark-outline)', () => {
    const fixture = setupFixture();
    fixture.detectChanges();

    const icons: NodeListOf<Element> = fixture.nativeElement.querySelectorAll('ion-icon[name="save-outline"]');
    // one inside .submit-section, one inside ion-fab-button
    expect(icons.length).toBeGreaterThanOrEqual(2);
    expect(fixture.nativeElement.querySelector('ion-icon[name="checkmark-outline"]')).toBeFalsy();
  });
});

// Plan: 2026-07-06-0930-add-page-trip-vehicle-autofill-fab-save — Test Plan TC-04
describe('AddPage — save() wiring (regression: shared by FAB + inline, validation/reset unchanged)', () => {
  let dataSpy: jasmine.SpyObj<FuelDataService>;
  let toastSpy: jasmine.SpyObj<ToastController>;
  let toastElSpy: jasmine.SpyObj<HTMLIonToastElement>;

  function setup(): AddPage {
    dataSpy = jasmine.createSpyObj<FuelDataService>('FuelDataService', [
      'getVehicles', 'getTrips', 'getBrands', 'getFuelTypes', 'getBrandFuels', 'addEntry',
    ]);
    dataSpy.getVehicles.and.resolveTo([]);
    dataSpy.getTrips.and.resolveTo([]);
    dataSpy.getBrands.and.resolveTo([]);
    dataSpy.getFuelTypes.and.resolveTo([]);
    dataSpy.getBrandFuels.and.resolveTo([]);
    dataSpy.addEntry.and.resolveTo({} as any);

    toastElSpy = jasmine.createSpyObj<HTMLIonToastElement>('HTMLIonToastElement', ['present']);
    toastElSpy.present.and.resolveTo();
    toastSpy = jasmine.createSpyObj<ToastController>('ToastController', ['create']);
    toastSpy.create.and.resolveTo(toastElSpy);

    TestBed.configureTestingModule({
      declarations: [AddPage],
      imports: [FormsModule],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        { provide: CameraService, useValue: jasmine.createSpyObj('CameraService', ['takePhoto', 'pickFromGallery']) },
        { provide: MeterOnnxService, useValue: jasmine.createSpyObj('MeterOnnxService', ['warmUp', 'readField']) },
        { provide: FuelDataService, useValue: dataSpy },
        { provide: ToastController, useValue: toastSpy },
      ],
    });

    return TestBed.createComponent(AddPage).componentInstance;
  }

  function mockForm(invalid: boolean): NgForm {
    return {
      invalid,
      control: { markAllAsTouched: jasmine.createSpy('markAllAsTouched') },
      resetForm: jasmine.createSpy('resetForm'),
    } as unknown as NgForm;
  }

  it('invalid form → shows error, does NOT call addEntry (validation unchanged)', async () => {
    const page = setup();
    const form = mockForm(true);

    await page.save(form);

    expect((form.control.markAllAsTouched as jasmine.Spy)).toHaveBeenCalled();
    expect(page.error).toBeTruthy();
    expect(dataSpy.addEntry).not.toHaveBeenCalled();
  });

  it('valid form with at least one numeric field → calls addEntry + resetForm (reset unchanged)', async () => {
    const page = setup();
    const form = mockForm(false);
    page.draft = { datetimeLocal: '2026-07-06T09:00', liters: 10 };

    await page.save(form);

    expect(dataSpy.addEntry).toHaveBeenCalled();
    expect(form.resetForm).toHaveBeenCalled();
    expect(page.error).toBeNull();
  });

  // Fix 2026-07-06-1033 — TC-04
  it('TC-04: valid form saved successfully → presents a success toast "บันทึกสำเร็จ"', async () => {
    const page = setup();
    const form = mockForm(false);
    page.draft = { datetimeLocal: '2026-07-06T09:00', liters: 10 };

    await page.save(form);

    expect(toastSpy.create).toHaveBeenCalledWith(jasmine.objectContaining({ message: 'บันทึกสำเร็จ' }));
    expect(toastElSpy.present).toHaveBeenCalled();
  });

  it('TC-04b (regression): invalid form does NOT present a success toast', async () => {
    const page = setup();
    const form = mockForm(true);

    await page.save(form);

    expect(toastSpy.create).not.toHaveBeenCalled();
  });

  // Note (untestable exception — §5.13 category 5, "3rd-party no-sandbox"): add.page.html wires
  // BOTH the inline submit button (<form (ngSubmit)="save(entryForm)">, type="submit") and the FAB
  // (<ion-fab-button (click)="save(entryForm)">) to the SAME save(entryForm) call via the SAME
  // #entryForm template ref (verified by inspection — add.page.html submit-section / ion-fab
  // blocks). A headless TestBed spec here does not bootstrap the Ionic Stencil web-component
  // runtime (no defineCustomElements()), so dispatching a real click through <ion-fab-button> /
  // <ion-button> custom elements cannot be exercised meaningfully in this spec — CUSTOM_ELEMENTS_SCHEMA
  // makes Angular treat them as opaque unknown elements. The shared save() behavior both call
  // paths invoke is fully covered by the two tests above; the wiring itself is a 1-line template
  // binding checked by code review / manual QA per the plan's Manual test step.
});
