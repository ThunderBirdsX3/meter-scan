import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AppComponent } from './app.component';
import { DbService } from './services/db.service';
import { SeedService } from './services/seed.service';

describe('AppComponent', () => {

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AppComponent],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

});

describe('AppComponent — DB bootstrap gating (FR-010/011)', () => {
  let dbSpy: jasmine.SpyObj<DbService>;
  let seedSpy: jasmine.SpyObj<SeedService>;

  beforeEach(async () => {
    dbSpy = jasmine.createSpyObj<DbService>('DbService', ['init']);
    seedSpy = jasmine.createSpyObj<SeedService>('SeedService', ['seedIfNeeded']);

    await TestBed.configureTestingModule({
      declarations: [AppComponent],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        { provide: DbService, useValue: dbSpy },
        { provide: SeedService, useValue: seedSpy },
      ],
    }).compileComponents();
  });

  it('sets dbReady = true after db.init() + seed.seedIfNeeded() both resolve', async () => {
    dbSpy.init.and.resolveTo();
    seedSpy.seedIfNeeded.and.resolveTo();

    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();

    expect(app.dbReady).toBeTrue();
    expect(app.dbError).toBeNull();
    expect(seedSpy.seedIfNeeded).toHaveBeenCalled();
  });

  it('sets a DB_INIT error state (not a crash) when db.init() rejects', async () => {
    dbSpy.init.and.rejectWith(new Error('native SQLite unavailable'));

    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();

    expect(app.dbReady).toBeFalse();
    expect(app.dbError).toBe('เปิดฐานข้อมูลไม่สำเร็จ');
    expect(seedSpy.seedIfNeeded).not.toHaveBeenCalled();
  });

  it('retryDbInit() re-attempts bootstrap and can recover to dbReady = true', async () => {
    dbSpy.init.and.rejectWith(new Error('fail once'));
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    expect(app.dbError).toBeTruthy();

    dbSpy.init.and.resolveTo();
    seedSpy.seedIfNeeded.and.resolveTo();
    await app.retryDbInit();

    expect(app.dbReady).toBeTrue();
    expect(app.dbError).toBeNull();
    expect(app.isRetrying).toBeFalse();
  });
});
