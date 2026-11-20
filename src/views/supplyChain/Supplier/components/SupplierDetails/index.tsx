import { Input, FormGrid, FormItem, Cascader } from '@formily/antd-v5';
import { Form, createForm } from '@formily/core';
import { createSchemaField } from '@formily/react';
import type { Citys } from '@src/api/types';
import FormilyCommon from '@src/components/FormilyUtil/FormilyCommon';
import FormilySupplierSelect, {
  supplierFieldEffect,
} from '@src/views/supplyChain/components/FormilySupplierSelect';
import { genSupplierSchema } from '@src/views/supplyChain/schema';
import { getInitialSupplierNumber } from '@src/views/supplyChain/service';
import { SupplierDetails as SupplierDetailsType } from '@src/views/supplyChain/type';
import {
  ForwardRefRenderFunction,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { apiCity } from '@/api/api';

type CityOption = Citys & {
  label: string;
  value: string;
  children?: CityOption[];
};
const formatCityOptions = (options: Citys[]): CityOption[] =>
  options.map(option => ({
    ...option,
    label: option.name,
    value: option.code,
    children: option.children ? formatCityOptions(option.children) : [],
  }));

const SchemaField = createSchemaField({
  components: {
    FormGrid,
    FormItem,
    Input,
    FormilySupplierSelect,
    Cascader,
  },
});

type SupplierDetailsProps = {
  isAdd: boolean;
  supplierDetails?: SupplierDetailsType;
  readPretty?: boolean;
  columns?: number;
  className?: string;
  colon?: boolean;
};

const SupplierDetails: ForwardRefRenderFunction<Form, SupplierDetailsProps> = (
  { isAdd, readPretty, supplierDetails, columns, className, colon },
  ref,
) => {
  const initialReadPretty = useRef(readPretty);
  const [cityOptionsFormId, setCityOptionsFormId] = useState<string>();
  const form = useMemo(
    () =>
      createForm({
        initialValues: supplierDetails,
        validateFirst: true,
        readPretty: initialReadPretty.current,
        effects: supplierFieldEffect,
      }),

    [supplierDetails],
  );

  useImperativeHandle(ref, () => form, [form]);

  useLayoutEffect(() => {
    form.setPattern(readPretty ? 'readPretty' : 'editable');
  }, [form, readPretty]);

  useEffect(() => {
    if (isAdd) {
      getInitialSupplierNumber().then(({ data }) => {
        form.setValues({
          companyNumber: data.data.companyNumber,
        });
      });
    }
  }, [isAdd, form]);

  useEffect(() => {
    let active = true;
    apiCity().then(options => {
      if (!active) {
        return;
      }
      form
        .query('area')
        ?.take()
        ?.setComponentProps({
          options: formatCityOptions(options),
          displayRender: undefined,
        });
      setCityOptionsFormId(form.id);
    });
    return () => {
      active = false;
    };
  }, [form]);
  return (
    <FormilyCommon form={form} className={className} colon={colon}>
      <SchemaField
        schema={genSupplierSchema({
          columns,
          supplierResult: supplierDetails?.inviteStatus,
          areaOptionsReady: cityOptionsFormId === form.id,
        })}
      />
    </FormilyCommon>
  );
};

export default forwardRef(SupplierDetails);
