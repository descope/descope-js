import { createSingletonMixin } from '../src';

type Mixin = (superclass: any) => any;

describe('createSingletonMixin', () => {
  // Base class for testing
  class BaseClass {
    baseProperty = 'base';
  }

  it('should apply mixin to superclass', () => {
    const testMixin: Mixin = (superclass: any) => {
      return class extends superclass {
        mixinProperty = 'mixin-applied';
      };
    };

    const singletonMixin = createSingletonMixin(testMixin as any);
    const MixedClass = singletonMixin(BaseClass as any);
    const instance = new MixedClass() as any;

    expect(instance.mixinProperty).toBe('mixin-applied');
    expect(instance.baseProperty).toBe('base');
  });

  it('should prevent duplicate mixin application', () => {
    const testMixin: Mixin = (superclass: any) => {
      return class extends superclass {
        mixinProperty = 'mixin-applied';
      };
    };

    const singletonMixin = createSingletonMixin(testMixin as any);

    // Apply mixin twice
    const MixedClass1 = singletonMixin(BaseClass as any);
    const MixedClass2 = singletonMixin(MixedClass1);

    // Should return the same class on second application
    expect(MixedClass1).toBe(MixedClass2);
  });

  it('should add methods to the mixed class', () => {
    const testMixin: Mixin = (superclass: any) => {
      return class extends superclass {
        customMethod() {
          return 'custom-method-result';
        }
      };
    };

    const singletonMixin = createSingletonMixin(testMixin as any);
    const MixedClass = singletonMixin(BaseClass as any);
    const instance = new MixedClass() as any;

    expect(instance.customMethod).toBeDefined();
    expect(instance.customMethod()).toBe('custom-method-result');
  });

  it('should preserve superclass properties', () => {
    class CustomBase {
      baseProperty = 'base-value';

      baseMethod() {
        return 'base-method-result';
      }
    }

    const testMixin: Mixin = (superclass: any) => {
      return class extends superclass {
        mixinProperty = 'mixin-value';
      };
    };

    const singletonMixin = createSingletonMixin(testMixin as any);
    const MixedClass = singletonMixin(CustomBase as any);
    const instance = new MixedClass() as any;

    expect(instance.baseProperty).toBe('base-value');
    expect(instance.baseMethod()).toBe('base-method-result');
    expect(instance.mixinProperty).toBe('mixin-value');
  });

  it('should work with multiple different mixins', () => {
    const mixin1 = createSingletonMixin(((superclass: any) => {
      return class extends superclass {
        method1 = () => 'method1';
      };
    }) as any);

    const mixin2 = createSingletonMixin(((superclass: any) => {
      return class extends superclass {
        method2 = () => 'method2';
      };
    }) as any);

    const MixedClass = mixin2(mixin1(BaseClass as any));
    const instance = new MixedClass() as any;

    expect(instance.method1()).toBe('method1');
    expect(instance.method2()).toBe('method2');
  });

  it('should allow same mixin to be applied at different levels of inheritance', () => {
    const execLog: string[] = [];

    const loggingMixin = createSingletonMixin(((superclass: any) => {
      return class extends superclass {
        log(message: string) {
          execLog.push(message);
        }
      };
    }) as any);

    // First branch
    const Branch1 = loggingMixin(BaseClass as any);
    const instance1 = new Branch1() as any;
    instance1.log('branch1');

    // Second branch - different starting point
    class AnotherBase {
      anotherProperty = 'another';
    }
    const Branch2 = loggingMixin(AnotherBase as any);
    const instance2 = new Branch2() as any;
    instance2.log('branch2');

    expect(execLog).toEqual(['branch1', 'branch2']);
  });

  it('should handle mixin with constructor parameters', () => {
    const testMixin: Mixin = (superclass: any) => {
      return class extends superclass {
        value: string;

        constructor() {
          super();
          this.value = 'initialized';
        }

        getValue() {
          return this.value;
        }
      };
    };

    const singletonMixin = createSingletonMixin(testMixin as any);
    const MixedClass = singletonMixin(BaseClass as any);
    const instance = new MixedClass() as any;

    expect(instance.getValue()).toBe('initialized');
  });

  it('should create unique symbols for different mixins', () => {
    const mixin1 = createSingletonMixin(((superclass: any) => {
      return class extends superclass {
        prop1 = 'value1';
      };
    }) as any);

    const mixin2 = createSingletonMixin(((superclass: any) => {
      return class extends superclass {
        prop2 = 'value2';
      };
    }) as any);

    // Apply mixin1 twice, then mixin2 twice
    const Step1 = mixin1(BaseClass as any);
    const Step2 = mixin1(Step1); // Should not reapply
    const Step3 = mixin2(Step2);
    const Step4 = mixin2(Step3); // Should not reapply

    expect(Step1).toBe(Step2);
    expect(Step3).toBe(Step4);
    expect(Step1).not.toBe(Step3);

    const instance = new Step4() as any;
    expect(instance.prop1).toBe('value1');
    expect(instance.prop2).toBe('value2');
  });

  it('should work with empty mixin (identity function)', () => {
    const emptyMixin = createSingletonMixin(
      ((superclass: any) => superclass) as any,
    );

    const MixedClass1 = emptyMixin(BaseClass as any);
    const MixedClass2 = emptyMixin(MixedClass1);

    // Should still prevent duplicate application
    expect(MixedClass1).toBe(MixedClass2);
  });
});
