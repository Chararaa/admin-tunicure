import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GeneralCategoryManagerComponent } from './general-category-manager.component';

describe('GeneralCategoryManagerComponent', () => {
  let component: GeneralCategoryManagerComponent;
  let fixture: ComponentFixture<GeneralCategoryManagerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GeneralCategoryManagerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GeneralCategoryManagerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
