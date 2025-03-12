import { Spin } from 'antd';
import { db } from '../db';
import { useEffect, useState } from 'react'

export const withDBCheck = <P extends object>(
  WrappedComponent: React.ComponentType<P>
) => {
  return function WithDBCheckComponent(props: P) {
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
      db.waitForInitialization().then(() => {
        setIsReady(true);
      });
    }, []);

    if (!isReady) {
      return <Spin />;
    }

    return <WrappedComponent {...props} />;
  };
};