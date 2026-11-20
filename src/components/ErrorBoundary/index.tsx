import I18N from '@src/lang/I18N';
import { Button, Result } from 'antd';
import { Component, ReactNode } from 'react';
import { withRouter, RouteComponentProps } from 'react-router-dom';

import styles from './index.module.less';

type ErrorBoundaryProps = {
  children: ReactNode;
} & RouteComponentProps;
type ErrorBoundaryState = {
  hasError: boolean;
};

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
    };
  }

  static getDerivedStateFromError(): Pick<ErrorBoundaryState, 'hasError'> {
    return { hasError: true };
  }

  componentDidCatch(err: Error) {
    // eslint-disable-next-line
    console.warn('main Page crash with error: ', err);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className={styles.fallback}>
          <Result
            className={styles.fallbackResult}
            status='warning'
            title='Error'
            subTitle='Sorry, something went wrong'
            extra={[
              <Button type='primary' onClick={() => window.location.reload()}>
                {I18N.components.refreshThePage}
              </Button>,
            ]}
          />
        </div>
      );
    }

    return this.props.children;
  }
}

export default withRouter(ErrorBoundary);
